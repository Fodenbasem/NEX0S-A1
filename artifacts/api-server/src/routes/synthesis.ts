import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, activityLogsTable } from "@workspace/db";
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

const STAGES = [
  { key: "consultation", label: "Consultation Analysis", range: [0, 5] },
  { key: "analysis", label: "Requirements Analysis", range: [5, 15] },
  { key: "frontend", label: "Frontend Synthesis", range: [15, 40] },
  { key: "backend", label: "Backend Synthesis", range: [40, 60] },
  { key: "database", label: "Database Generation", range: [60, 75] },
  { key: "security", label: "Security Hardening", range: [75, 90] },
  { key: "deployment", label: "Deployment Pipeline", range: [90, 100] },
] as const;

async function callGemini(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function callOpenRouter(prompt: string): Promise<string> {
  const res = await openrouter.chat.completions.create({
    model: "google/gemini-2.0-flash-exp:free",
    messages: [{ role: "user", content: prompt }],
  });
  return res.choices[0]?.message?.content ?? "";
}

async function callAI(prompt: string): Promise<string> {
  if (process.env.GOOGLE_API_KEY) {
    try { return await callGemini(prompt); } catch { }
  }
  if (process.env.OPENAI_API_KEY) {
    try { return await callOpenRouter(prompt); } catch { }
  }
  return "AI engine unavailable — check GOOGLE_API_KEY / OPENAI_API_KEY.";
}

const STAGE_PROMPTS = (projectName: string, stack: string | null, description: string | null) => ({
  consultation: `You are NEX0S-A1, an AI software architect. Analyze this project and extract the core requirements in 3-5 bullet points.\n\nProject: "${projectName}"\nDescription: "${description ?? "No description provided"}"\nStack: "${stack ?? "Auto-detect"}"\n\nBe concise and technical.`,
  analysis: `You are NEX0S-A1. Map out the technical requirements for this project.\n\nProject: "${projectName}"\nStack: "${stack ?? "auto"}"\n\nList: API endpoints needed, data models, auth requirements, integrations. Be specific.`,
  frontend: `You are NEX0S-A1 synthesizing the frontend for "${projectName}" using ${stack ?? "React + TypeScript + Tailwind"}.\n\nList the components to generate (e.g., Layout, NavBar, Dashboard, etc.) with a one-line description each. Format as a bullet list.`,
  backend: `You are NEX0S-A1 synthesizing the backend for "${projectName}" using ${stack ?? "Express + Node.js"}.\n\nList: routes (method + path + purpose), middlewares, service classes. Format as concise bullet points.`,
  database: `You are NEX0S-A1. Generate the database schema for "${projectName}".\n\nList each table/collection with key fields and types. Format as:\n- table_name: field (type), field (type), ...`,
  security: `You are NEX0S-A1. Generate the security hardening checklist for "${projectName}".\n\nList OWASP-aligned checks applied: authentication, input validation, rate limiting, CSRF, XSS, SQL injection prevention. Keep it concise.`,
  deployment: `You are NEX0S-A1. Generate the deployment pipeline summary for "${projectName}".\n\nList the steps: containerization, CI/CD, environment config, health checks, live URL pattern. Be concise.`,
});

router.get("/synthesis/stream/:projectId", requireAuth, async (req, res) => {
  const { userId } = req;
  const { projectId } = req.params;

  const [project] = await db.select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.ownerId, userId)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    await db.update(projectsTable).set({ status: "synthesizing", synthesisProgress: 0, updatedAt: new Date() })
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.ownerId, userId)));

    const prompts = STAGE_PROMPTS(project.name, project.stack, project.description);

    for (const stage of STAGES) {
      const [start, end] = stage.range;
      send({ type: "stage_start", stage: stage.key, label: stage.label, progress: start });

      await db.update(projectsTable).set({ synthesisProgress: start, updatedAt: new Date() })
        .where(and(eq(projectsTable.id, projectId), eq(projectsTable.ownerId, userId)));

      const prompt = prompts[stage.key as keyof typeof prompts];
      let content = "";
      try {
        content = await callAI(prompt);
      } catch {
        content = `[${stage.label}] Processing complete.`;
      }

      await db.update(projectsTable).set({ synthesisProgress: end, updatedAt: new Date() })
        .where(and(eq(projectsTable.id, projectId), eq(projectsTable.ownerId, userId)));

      send({ type: "stage_done", stage: stage.key, label: stage.label, progress: end, content });
    }

    await db.update(projectsTable).set({ status: "deployed", synthesisProgress: 100, updatedAt: new Date() })
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.ownerId, userId)));

    await db.insert(activityLogsTable).values({
      userId, projectId, action: "synthesis.complete", severity: "info", category: "project",
      metadata: { stages: STAGES.length },
    });

    send({ type: "done", progress: 100 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Synthesis failed";
    send({ type: "error", message });
  } finally {
    res.end();
  }
});

export default router;
