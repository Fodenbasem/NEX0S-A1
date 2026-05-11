import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, aiRequestsTable, activityLogsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/projects", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.ownerId, userId))
      .orderBy(desc(projectsTable.createdAt))
      .limit(50);
    res.json(projects.map(p => ({ ...p, owner_id: p.ownerId, synthesis_progress: p.synthesisProgress, created_at: p.createdAt, updated_at: p.updatedAt })));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/projects", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const { name, description, language, stack } = req.body;
    const [project] = await db.insert(projectsTable).values({
      ownerId: userId,
      name,
      description: description ?? null,
      language: language ?? "en",
      stack: stack ?? "Next + Postgres",
      status: "consulting",
    }).returning();
    await db.insert(activityLogsTable).values({
      userId,
      projectId: project.id,
      action: "project.created",
      severity: "info",
      category: "project",
      metadata: { name },
    });
    res.status(201).json({ ...project, owner_id: project.ownerId, synthesis_progress: project.synthesisProgress, created_at: project.createdAt, updated_at: project.updatedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.patch("/projects/:id", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const [existing] = await db.select({ id: projectsTable.id })
      .from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.ownerId, userId)));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    const patch: Record<string, unknown> = {};
    const allowed = ["name", "description", "status", "language", "stack", "blueprint", "synthesis_progress"];
    for (const k of allowed) {
      if (k in req.body) {
        if (k === "synthesis_progress") patch.synthesisProgress = req.body[k];
        else patch[k] = req.body[k];
      }
    }
    patch.updatedAt = new Date();
    await db.update(projectsTable).set(patch).where(and(eq(projectsTable.id, id), eq(projectsTable.ownerId, userId)));
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.delete("/projects/:id", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const [existing] = await db.select({ id: projectsTable.id })
      .from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.ownerId, userId)));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await db.delete(projectsTable).where(and(eq(projectsTable.id, id), eq(projectsTable.ownerId, userId)));
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/projects/:id/duplicate", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const [src] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.ownerId, userId)));
    if (!src) { res.status(404).json({ error: "Project not found" }); return; }
    const [copy] = await db.insert(projectsTable).values({
      ownerId: userId,
      name: `${src.name} (copy)`,
      description: src.description,
      language: src.language,
      stack: src.stack,
      blueprint: src.blueprint,
      status: "consulting",
    }).returning();
    const msgs = await db.select().from(aiRequestsTable)
      .where(and(eq(aiRequestsTable.projectId, id), eq(aiRequestsTable.userId, userId)))
      .orderBy(aiRequestsTable.createdAt);
    if (msgs.length) {
      await db.insert(aiRequestsTable).values(msgs.map(m => ({
        projectId: copy.id, userId, role: m.role, content: m.content,
        model: m.model, tokensIn: m.tokensIn, tokensOut: m.tokensOut, latencyMs: m.latencyMs,
      })));
    }
    await db.insert(activityLogsTable).values({ userId, projectId: copy.id, action: "project.duplicated", severity: "info", category: "project", metadata: { from: id } });
    res.status(201).json({ ...copy, owner_id: copy.ownerId, synthesis_progress: copy.synthesisProgress, created_at: copy.createdAt, updated_at: copy.updatedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/projects/:id/blueprint", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.ownerId, userId)));
    if (!project) { res.status(404).json({ error: "Not found" }); return; }
    const messages = await db.select().from(aiRequestsTable)
      .where(and(eq(aiRequestsTable.projectId, id), eq(aiRequestsTable.userId, userId)))
      .orderBy(aiRequestsTable.createdAt);
    res.json({
      project: { ...project, owner_id: project.ownerId, synthesis_progress: project.synthesisProgress, created_at: project.createdAt, updated_at: project.updatedAt },
      messages: messages.map(m => ({ ...m, project_id: m.projectId, user_id: m.userId, tokens_in: m.tokensIn, tokens_out: m.tokensOut, latency_ms: m.latencyMs, created_at: m.createdAt })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/projects/:id/messages", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const [project] = await db.select({ id: projectsTable.id })
      .from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.ownerId, userId)));
    if (!project) { res.status(404).json({ error: "Not found" }); return; }
    const messages = await db.select().from(aiRequestsTable)
      .where(and(eq(aiRequestsTable.projectId, id), eq(aiRequestsTable.userId, userId)))
      .orderBy(aiRequestsTable.createdAt);
    res.json(messages.map(m => ({ ...m, project_id: m.projectId, user_id: m.userId, tokens_in: m.tokensIn, tokens_out: m.tokensOut, latency_ms: m.latencyMs, created_at: m.createdAt })));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
