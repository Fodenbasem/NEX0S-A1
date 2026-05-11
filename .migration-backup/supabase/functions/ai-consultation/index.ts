// NEX0S A1 — AI Consultation edge function (SSE streaming).
// Streams token-by-token from Lovable AI Gateway. Gemini primary, GPT fallback.
// No external API keys required — LOVABLE_API_KEY is auto-injected.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are NEX0S A1 — an autonomous AI software architect.
Conduct a precise consultation with the user (English or Arabic — match their language).
Goals:
1. Clarify functional requirements, target users, and constraints with focused questions.
2. Propose a production-grade technical blueprint: stack, key modules, data model sketch, auth model, security posture, deployment.
3. Be concise. No filler. Use short paragraphs and bullet lists when helpful.
4. When the user confirms, output a final BLUEPRINT block.

Tone: senior engineer, calm, decisive, security-conscious.`;

interface ChatMessage { role: "user" | "ai" | "system"; content: string }

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "Method not allowed");

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return jsonError(500, "AI Gateway not configured");

  let body: { messages?: ChatMessage[]; stream?: boolean };
  try { body = await req.json(); } catch { return jsonError(400, "Invalid JSON body"); }

  const history = (body.messages ?? []).slice(-20);
  if (!history.length) return jsonError(400, "messages array is required");

  const mapped = history.map((m) => ({
    role: m.role === "ai" ? "assistant" : m.role === "system" ? "system" : "user",
    content: String(m.content ?? "").slice(0, 6000),
  }));

  const candidates = ["google/gemini-2.5-flash", "openai/gpt-5-mini"];
  const t0 = Date.now();

  // Try each model — first one to return ok streams to client.
  for (const model of candidates) {
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...mapped],
      }),
    });

    if (upstream.status === 429) return jsonError(429, "Rate limit reached. Please retry shortly.");
    if (upstream.status === 402) return jsonError(402, "AI credits exhausted. Please top up Lovable AI usage.");
    if (!upstream.ok || !upstream.body) continue; // try next model

    // Pass the SSE stream straight through, plus an `x-nex0s-model` header so the client knows which model answered.
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "text/event-stream");
    headers.set("Cache-Control", "no-cache");
    headers.set("Connection", "keep-alive");
    headers.set("x-nex0s-model", model);
    headers.set("x-nex0s-t0", String(t0));
    return new Response(upstream.body, { status: 200, headers });
  }

  return jsonError(502, "All AI providers failed");
});
