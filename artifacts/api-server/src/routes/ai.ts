import { Router } from "express";
import { db } from "@workspace/db";
import { aiRequestsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const router = Router();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

const SYSTEM_PROMPT = `You are NEX0S-A1, an expert AI software architect. You help users design and plan software projects through structured consultation. You:
- Ask focused, clarifying questions to understand requirements
- Suggest appropriate technology stacks
- Create structured technical blueprints
- Support both English and Arabic
- Are concise but thorough
- Focus on production-ready, scalable architecture

When enough information is gathered, produce a structured blueprint with: architecture, tech stack, database schema outline, API endpoints, and deployment strategy.`;

async function streamGemini(
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  userMessage: string,
  onToken: (t: string) => void,
): Promise<{ content: string; model: string }> {
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
  const modelId = "google/gemini-2.0-flash-exp:free";
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
    if (process.env.GOOGLE_API_KEY) {
      try {
        const history = rawMsgs.map(m => ({
          role: (m.role === "ai" ? "model" : "user") as "user" | "model",
          parts: [{ text: m.content }],
        }));
        const r = await streamGemini(history, message.trim(), onToken);
        finalModel = r.model;
      } catch (geminiErr) {
        console.warn("[ai] Gemini failed, falling back to OpenRouter:", geminiErr);
        if (process.env.OPENAI_API_KEY) {
          const history = rawMsgs.map(m => ({
            role: (m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
            content: m.content,
          }));
          const r = await streamOpenRouter(history, message.trim(), onToken);
          finalModel = r.model;
        } else {
          throw geminiErr;
        }
      }
    } else if (process.env.OPENAI_API_KEY) {
      const history = rawMsgs.map(m => ({
        role: (m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
        content: m.content,
      }));
      const r = await streamOpenRouter(history, message.trim(), onToken);
      finalModel = r.model;
    } else {
      throw new Error("No AI API key configured (GOOGLE_API_KEY or OPENAI_API_KEY)");
    }

    res.setHeader("x-nex0s-model", finalModel);
    res.setHeader("x-nex0s-t0", String(t0));
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
    const message = err instanceof Error ? err.message : "AI gateway error";
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
});

export default router;
