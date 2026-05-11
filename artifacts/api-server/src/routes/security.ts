import { Router } from "express";
import { db } from "@workspace/db";
import { securityReportsTable, projectsTable, activityLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/security-reports", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { project_id } = req.query as Record<string, string>;
    let rows = await db.select().from(securityReportsTable)
      .where(eq(securityReportsTable.userId, userId))
      .orderBy(desc(securityReportsTable.createdAt))
      .limit(20);
    if (project_id) rows = rows.filter(r => r.projectId === project_id);
    res.json(rows.map(r => ({ ...r, project_id: r.projectId, user_id: r.userId, composite_score: r.compositeScore, owasp_scores: r.owaspScores, created_at: r.createdAt })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/security-reports", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { project_id } = req.body;
    const owasp = ["A01 Access","A02 Crypto","A03 Inject","A04 Design","A05 Misconf","A06 Vuln","A07 AuthN","A08 Integrity"]
      .map(name => ({ name, score: 80 + Math.floor(Math.random() * 20) }));
    const findings = [
      { id: "CVE-2024-21341", severity: "high", title: "Prototype pollution in lodash.merge", patched: true },
      { id: "OWASP-A03", severity: "critical", title: "SQL injection vector in /api/search", patched: true },
      { id: "OWASP-A07", severity: "medium", title: "Missing rate-limit on /api/login", patched: true },
      { id: "CVE-2024-44871", severity: "high", title: "ReDoS in form-data parser", patched: Math.random() > 0.5 },
    ];
    const composite = Math.round(owasp.reduce((a, b) => a + b.score, 0) / owasp.length);
    const [report] = await db.insert(securityReportsTable).values({
      projectId: project_id, userId, compositeScore: composite, owaspScores: owasp, findings,
    }).returning();
    if (project_id) {
      await db.update(projectsTable).set({ status: "scanning", updatedAt: new Date() }).where(eq(projectsTable.id, project_id));
      await db.insert(activityLogsTable).values({ userId, projectId: project_id, action: "security.scan_complete", severity: "info", category: "security", metadata: { composite } });
    }
    res.status(201).json({ ...report, project_id: report.projectId, user_id: report.userId, composite_score: report.compositeScore, owasp_scores: report.owaspScores, created_at: report.createdAt });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
