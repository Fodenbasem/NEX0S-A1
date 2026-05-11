import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, aiRequestsTable, securityReportsTable, deploymentsTable, activityLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const [projects, aiReqs, secReports, deps] = await Promise.all([
      db.select().from(projectsTable).where(eq(projectsTable.ownerId, userId)),
      db.select().from(aiRequestsTable).where(eq(aiRequestsTable.userId, userId)),
      db.select({ compositeScore: securityReportsTable.compositeScore }).from(securityReportsTable).where(eq(securityReportsTable.userId, userId)),
      db.select({ status: deploymentsTable.status }).from(deploymentsTable).where(eq(deploymentsTable.userId, userId)),
    ]);
    const secAvg = secReports.length
      ? Math.round(secReports.reduce((a, r) => a + (r.compositeScore ?? 0), 0) / secReports.length)
      : 0;
    res.json({
      projectCount: projects.length,
      aiRequestCount: aiReqs.length,
      avgSecurityScore: secAvg,
      deploymentCount: deps.filter(d => d.status === "success").length,
      activeProjects: projects.filter(p => p.status !== "failed").length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/dashboard/ai-activity", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const rows = await db.select({ createdAt: aiRequestsTable.createdAt, latencyMs: aiRequestsTable.latencyMs })
      .from(aiRequestsTable).where(eq(aiRequestsTable.userId, userId)).orderBy(desc(aiRequestsTable.createdAt));
    const filtered = rows.filter(r => r.createdAt >= since);
    const buckets: Record<string, { time: string; requests: number; latency: number; n: number }> = {};
    ["00:00","04:00","08:00","12:00","16:00","20:00"].forEach(t => { buckets[t] = { time: t, requests: 0, latency: 0, n: 0 }; });
    filtered.forEach(row => {
      const h = new Date(row.createdAt).getHours();
      const t = ["00:00","04:00","08:00","12:00","16:00","20:00"][Math.floor(h / 4)];
      buckets[t].requests++;
      if (row.latencyMs) { buckets[t].latency += row.latencyMs; buckets[t].n++; }
    });
    res.json(Object.values(buckets).map(b => ({ time: b.time, requests: b.requests, latency: b.n ? Math.round(b.latency / b.n) : 0 })));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/dashboard/model-routing", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const rows = await db.select({ model: aiRequestsTable.model }).from(aiRequestsTable).where(eq(aiRequestsTable.userId, userId)).limit(2000);
    const counts: Record<string, number> = {};
    rows.filter(r => r.model).forEach(r => { counts[r.model!] = (counts[r.model!] ?? 0) + 1; });
    res.json(Object.entries(counts).map(([name, calls]) => ({ name, calls })).sort((a, b) => b.calls - a.calls));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/dashboard/cost-split", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const rows = await db.select({ action: activityLogsTable.action }).from(activityLogsTable).where(eq(activityLogsTable.userId, userId)).limit(2000);
    const buckets = { Synthesis: 0, Security: 0, Consult: 0, Other: 0 };
    rows.forEach(r => {
      if (r.action.startsWith("project")) buckets.Consult++;
      else if (r.action.startsWith("security")) buckets.Security++;
      else if (r.action.startsWith("deployment")) buckets.Synthesis++;
      else buckets.Other++;
    });
    const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
    const palette = ["oklch(0.78 0.18 200)", "oklch(0.65 0.22 305)", "oklch(0.78 0.18 155)", "oklch(0.82 0.17 80)"];
    res.json(Object.entries(buckets).map(([name, v], i) => ({ name, value: Math.round((v / total) * 100), color: palette[i] })));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
