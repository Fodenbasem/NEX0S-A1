import { Router } from "express";
import { db } from "@workspace/db";
import { aiRequestsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "placeholder",
});

const SYSTEM_PROMPT = `You are NEX0S A1, an expert AI software architect. You help users design and plan software projects through structured consultation. You:
- Ask focused, clarifying questions to understand requirements
- Suggest appropriate technology stacks
- Create structured technical blueprints
- Support both English and Arabic
- Are concise but thorough
- Focus on production-ready, scalable architecture

When enough information is gathered, produce a structured blueprint with: architecture, tech stack, database schema outline, API endpoints, and deployment strategy.`;

router.post("/ai/stream", requireAuth, async (req, res) => {
  const { userId } = req;
  const { project_id, message } = req.body;

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  // If a project_id is given, verify ownership before loading history
  if (project_id) {
    const [project] = await db.select({ id: projectsTable.id })
      .from(projectsTable)
      .where(and(eq(projectsTable.id, project_id), eq(projectsTable.ownerId, userId)));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
  }

  // Load conversation history scoped to this user's project
  let history: { role: "user" | "assistant"; content: string }[] = [];
  if (project_id) {
    const msgs = await db.select().from(aiRequestsTable)
      .where(and(eq(aiRequestsTable.projectId, project_id), eq(aiRequestsTable.userId, userId)))
      .orderBy(aiRequestsTable.createdAt)
      .limit(40);
    history = msgs.map(m => ({
      role: m.role === "ai" ? "assistant" as const : "user" as const,
      content: m.content,
    }));
  }

  // Persist user message
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
  res.setHeader("x-nex0s-model", "gpt-4o-mini");
  res.setHeader("x-nex0s-t0", String(t0));

  let fullContent = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message.trim() },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();

    const latencyMs = Date.now() - t0;

    // Persist AI response
    if (project_id && fullContent) {
      await db.insert(aiRequestsTable).values({
        projectId: project_id, userId, role: "ai", content: fullContent,
        model: "gpt-4o-mini", tokensIn: null, tokensOut: null, latencyMs,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
});

export default router;
