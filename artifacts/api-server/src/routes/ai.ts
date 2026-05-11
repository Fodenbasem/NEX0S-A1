import { Router } from "express";
import { db } from "@workspace/db";
import { aiRequestsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const router = Router();

function getGeminiKey(): string {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
}

function getOpenRouterKey(): string {
  return process.env.OPENAI_API_KEY ?? "";
}

const SYSTEM_PROMPT = `You are NEX0S-A1, an expert AI software architect. You help users design and plan software projects through structured consultation. You:
- Ask focused, clarifying questions to understand requirements
- Suggest appropriate technology stacks
- Create structured technical blueprints
- Support both English and Arabic (respond in the same language the user uses)
- Are concise but thorough
- Focus on production-ready, scalable architecture

When enough information is gathered, produce a structured blueprint with: architecture, tech stack, database schema outline, API endpoints, and deployment strategy.`;

async function streamGemini(
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  userMessage: string,
  onToken: (t: string) => void,
): Promise<{ content: string; model: string }> {
  const genAI = new GoogleGenerativeAI(getGeminiKey());
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Understood. I am NEX0S-A1, ready to assist." }] },
      ...history,
    ],
  });
  const result = await chat.sendMessageStream(userMessage);
  let full = "";
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) { full += text; onToken(text); }
  }
  return { content: full, model: "gemini-2.0-flash" };
}

async function streamOpenRouter(
  history: { role: "user" | "assistant"; content: string }[],
  userMessage: string,
  onToken: (t: string) => void,
): Promise<{ content: string; model: string }> {
  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: getOpenRouterKey(),
    defaultHeaders: {
      "HTTP-Referer": "https://nex0s-a1.replit.app",
      "X-Title": "NEX0S-A1",
    },
  });
  const modelId = "openai/gpt-4o-mini";
  const stream = await openrouter.chat.completions.create({
    model: modelId,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: userMessage },
    ],
    stream: true,
  });
  let full = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) { full += delta; onToken(delta); }
  }
  return { content: full, model: modelId };
}

async function streamAI(
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  orHistory: { role: "user" | "assistant"; content: string }[],
  userMessage: string,
  onToken: (t: string) => void,
): Promise<{ content: string; model: string }> {
  const geminiKey = getGeminiKey();
  const openrouterKey = getOpenRouterKey();

  if (geminiKey) {
    try {
      return await streamGemini(history, userMessage, onToken);
    } catch (geminiErr) {
      const msg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
      console.warn("[ai] Gemini failed, trying OpenRouter:", msg.slice(0, 120));
    }
  }

  if (openrouterKey) {
    try {
      return await streamOpenRouter(orHistory, userMessage, onToken);
    } catch (orErr) {
      const msg = orErr instanceof Error ? orErr.message : String(orErr);
      console.error("[ai] OpenRouter also failed:", msg.slice(0, 120));
      throw new Error("All AI providers failed. Check API keys and quota.");
    }
  }

  throw new Error("No AI provider available — set GEMINI_API_KEY or OPENAI_API_KEY");
}

router.post("/ai/stream", requireAuth, async (req, res) => {
  const { userId } = req;
  const { project_id, message } = req.body;

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  if (project_id) {
    const [project] = await db.select({ id: projectsTable.id })
      .from(projectsTable)
      .where(and(eq(projectsTable.id, project_id), eq(projectsTable.ownerId, userId)));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  }

  const rawMsgs = project_id
    ? await db.select().from(aiRequestsTable)
        .where(and(eq(aiRequestsTable.projectId, project_id), eq(aiRequestsTable.userId, userId)))
        .orderBy(aiRequestsTable.createdAt)
        .limit(40)
    : [];

  if (project_id) {
    await db.insert(aiRequestsTable).values({
      projectId: project_id, userId, role: "user", content: message.trim(),
      model: null, tokensIn: null, tokensOut: null, latencyMs: null,
    });
  }

  const t0 = Date.now();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let finalContent = "";
  let finalModel = "gemini-2.0-flash";

  const onToken = (delta: string) => {
    finalContent += delta;
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`);
  };

  try {
    const geminiHistory = rawMsgs.map(m => ({
      role: (m.role === "ai" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content }],
    }));
    const orHistory = rawMsgs.map(m => ({
      role: (m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    }));

    const result = await streamAI(geminiHistory, orHistory, message.trim(), onToken);
    finalModel = result.model;
    finalContent = result.content;

    res.write("data: [DONE]\n\n");
    res.end();

    const latencyMs = Date.now() - t0;
    if (project_id && finalContent) {
      await db.insert(aiRequestsTable).values({
        projectId: project_id, userId, role: "ai", content: finalContent,
        model: finalModel, tokensIn: null, tokensOut: null, latencyMs,
      });
    }
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "AI gateway error";
    if (!res.headersSent) {
      res.status(500).json({ error: errMessage });
    } else {
      res.write(`data: ${JSON.stringify({ error: errMessage })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});

export default router;
