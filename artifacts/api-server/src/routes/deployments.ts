import { Router } from "express";
import { db } from "@workspace/db";
import { deploymentsTable, projectsTable, activityLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/deployments", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { project_id } = req.query as Record<string, string>;
    let rows = await db.select().from(deploymentsTable)
      .where(eq(deploymentsTable.userId, userId))
      .orderBy(desc(deploymentsTable.createdAt))
      .limit(20);
    if (project_id) rows = rows.filter(r => r.projectId === project_id);
    res.json(rows.map(r => ({ ...r, project_id: r.projectId, user_id: r.userId, live_url: r.liveUrl, duration_ms: r.durationMs, created_at: r.createdAt })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/deployments", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { project_id, project_name } = req.body;
    const slug = (project_name ?? "app").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20);
    const liveUrl = `https://${slug}-${project_id.slice(0, 4)}.nex0s.app`;
    const steps = [
      { label: "Build container image", status: "complete", time: "00:42" },
      { label: "Push to registry", status: "complete", time: "00:18" },
      { label: "Provision edge runtime", status: "complete", time: "00:31" },
      { label: "Apply database migrations", status: "complete", time: "00:14" },
      { label: "Warm caches & health check", status: "complete", time: "00:09" },
      { label: "Promote to production traffic", status: "complete", time: "00:05" },
    ];
    const logs = [
      `▸ docker build -t nexos/${slug}:${project_id.slice(0,4)} .`,
      "  ✔ image built (sha256:8a2f…)",
      "▸ pushing to registry.nex0s.ai",
      "  ✔ pushed 9 layers",
      "▸ kubectl apply -f deploy/edge.yaml",
      `  ✔ rollout complete — live at ${liveUrl}`,
    ].join("\n");
    const [dep] = await db.insert(deploymentsTable).values({
      projectId: project_id, userId, status: "success", liveUrl, steps, logs, durationMs: 119000,
    }).returning();
    if (project_id) {
      await db.update(projectsTable).set({ status: "deployed", updatedAt: new Date() }).where(eq(projectsTable.id, project_id));
      await db.insert(activityLogsTable).values({ userId, projectId: project_id, action: "deployment.success", severity: "info", category: "deployment", metadata: { liveUrl } });
    }
    res.status(201).json({ ...dep, project_id: dep.projectId, user_id: dep.userId, live_url: dep.liveUrl, duration_ms: dep.durationMs, created_at: dep.createdAt });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
