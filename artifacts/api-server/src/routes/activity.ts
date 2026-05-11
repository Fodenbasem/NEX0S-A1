import { Router } from "express";
import { db } from "@workspace/db";
import { activityLogsTable } from "@workspace/db";
import { eq, desc, and, ilike } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.post("/activity", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
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
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/audit", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { severity, category, q, limit } = req.query as Record<string, string>;
    let rows = await db.select().from(activityLogsTable)
      .where(eq(activityLogsTable.userId, userId))
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(Number(limit) || 200);
    if (severity) rows = rows.filter(r => r.severity === severity);
    if (category) rows = rows.filter(r => r.category === category);
    if (q) rows = rows.filter(r => r.action.toLowerCase().includes(q.toLowerCase()) || JSON.stringify(r.metadata ?? {}).toLowerCase().includes(q.toLowerCase()));
    res.json(rows.map(r => ({ ...r, user_id: r.userId, project_id: r.projectId, created_at: r.createdAt })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
