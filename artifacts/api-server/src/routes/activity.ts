import { Router } from "express";
import { db } from "@workspace/db";
import { activityLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.post("/activity", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const { project_id, action, severity, category, metadata } = req.body;
    await db.insert(activityLogsTable).values({
      userId,
      projectId: project_id ?? null,
      action,
      severity: severity ?? "info",
      category: category ?? "system",
      metadata: metadata ?? null,
    });
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/audit", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const { severity, category, q, limit } = req.query as Record<string, string>;
    let rows = await db.select().from(activityLogsTable)
      .where(eq(activityLogsTable.userId, userId))
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(Number(limit) || 200);
    if (severity) rows = rows.filter(r => r.severity === severity);
    if (category) rows = rows.filter(r => r.category === category);
    if (q) {
      const ql = q.toLowerCase();
      rows = rows.filter(r =>
        r.action.toLowerCase().includes(ql) ||
        JSON.stringify(r.metadata ?? {}).toLowerCase().includes(ql)
      );
    }
    res.json(rows.map(r => ({ ...r, user_id: r.userId, project_id: r.projectId, created_at: r.createdAt })));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
