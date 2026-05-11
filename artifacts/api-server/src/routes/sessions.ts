import { Router } from "express";
import { db } from "@workspace/db";
import { userSessionsTable, activityLogsTable } from "@workspace/db";
import { eq, and, isNull, ne } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.post("/sessions/upsert", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { session_token, user_agent, browser, os, device, ip_address, location } = req.body;
    const [existing] = await db.select().from(userSessionsTable)
      .where(and(eq(userSessionsTable.sessionToken, session_token), eq(userSessionsTable.userId, userId)));
    if (existing) {
      const [updated] = await db.update(userSessionsTable).set({
        lastSeenAt: new Date(),
        ipAddress: ip_address ?? existing.ipAddress,
        location: location ?? existing.location,
        revokedAt: null,
      }).where(eq(userSessionsTable.id, existing.id)).returning();
      res.json({ ...updated, user_id: updated.userId, session_token: updated.sessionToken, user_agent: updated.userAgent, ip_address: updated.ipAddress, mfa_verified: updated.mfaVerified, risk_score: updated.riskScore, created_at: updated.createdAt, last_seen_at: updated.lastSeenAt, revoked_at: updated.revokedAt });
    } else {
      const [created] = await db.insert(userSessionsTable).values({
        userId, sessionToken: session_token,
        userAgent: user_agent, browser, os, device,
        ipAddress: ip_address, location, mfaVerified: false, riskScore: 0,
      }).returning();
      await db.insert(activityLogsTable).values({ userId, action: "session.started", severity: "info", category: "session", metadata: { browser, os, device, ip_address, location } });
      res.json({ ...created, user_id: created.userId, session_token: created.sessionToken, user_agent: created.userAgent, ip_address: created.ipAddress, mfa_verified: created.mfaVerified, risk_score: created.riskScore, created_at: created.createdAt, last_seen_at: created.lastSeenAt, revoked_at: created.revokedAt });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/sessions", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const sessions = await db.select().from(userSessionsTable)
      .where(and(eq(userSessionsTable.userId, userId), isNull(userSessionsTable.revokedAt)))
      .orderBy(userSessionsTable.lastSeenAt);
    res.json(sessions.map(s => ({ ...s, user_id: s.userId, session_token: s.sessionToken, user_agent: s.userAgent, ip_address: s.ipAddress, mfa_verified: s.mfaVerified, risk_score: s.riskScore, created_at: s.createdAt, last_seen_at: s.lastSeenAt, revoked_at: s.revokedAt })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/sessions/:id/revoke", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    await db.update(userSessionsTable).set({ revokedAt: new Date() }).where(eq(userSessionsTable.id, id));
    await db.insert(activityLogsTable).values({ userId, action: "session.revoked", severity: "medium", category: "session", metadata: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/sessions/revoke-others", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { current_token } = req.body;
    await db.update(userSessionsTable).set({ revokedAt: new Date() })
      .where(and(eq(userSessionsTable.userId, userId), isNull(userSessionsTable.revokedAt), ne(userSessionsTable.sessionToken, current_token)));
    await db.insert(activityLogsTable).values({ userId, action: "session.revoked_all_others", severity: "high", category: "session" });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
