import { Router } from "express";
import { db } from "@workspace/db";
import { userSessionsTable, activityLogsTable } from "@workspace/db";
import { eq, and, isNull, ne } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.post("/sessions/upsert", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const { session_token, user_agent, browser, os, device, ip_address, location } = req.body;
    const [existing] = await db.select().from(userSessionsTable)
      .where(and(eq(userSessionsTable.sessionToken, session_token), eq(userSessionsTable.userId, userId)));
    if (existing) {
      const [updated] = await db.update(userSessionsTable).set({
        lastSeenAt: new Date(),
        ipAddress: ip_address ?? existing.ipAddress,
        location: location ?? existing.location,
        revokedAt: null,
      }).where(and(eq(userSessionsTable.id, existing.id), eq(userSessionsTable.userId, userId))).returning();
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/sessions", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const sessions = await db.select().from(userSessionsTable)
      .where(and(eq(userSessionsTable.userId, userId), isNull(userSessionsTable.revokedAt)))
      .orderBy(userSessionsTable.lastSeenAt);
    res.json(sessions.map(s => ({ ...s, user_id: s.userId, session_token: s.sessionToken, user_agent: s.userAgent, ip_address: s.ipAddress, mfa_verified: s.mfaVerified, risk_score: s.riskScore, created_at: s.createdAt, last_seen_at: s.lastSeenAt, revoked_at: s.revokedAt })));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/sessions/:id/revoke", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const [existing] = await db.select({ id: userSessionsTable.id })
      .from(userSessionsTable)
      .where(and(eq(userSessionsTable.id, id), eq(userSessionsTable.userId, userId)));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await db.update(userSessionsTable).set({ revokedAt: new Date() })
      .where(and(eq(userSessionsTable.id, id), eq(userSessionsTable.userId, userId)));
    await db.insert(activityLogsTable).values({ userId, action: "session.revoked", severity: "medium", category: "session", metadata: { id } });
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/sessions/revoke-others", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const { current_token } = req.body;
    await db.update(userSessionsTable).set({ revokedAt: new Date() })
      .where(and(eq(userSessionsTable.userId, userId), isNull(userSessionsTable.revokedAt), ne(userSessionsTable.sessionToken, current_token)));
    await db.insert(activityLogsTable).values({ userId, action: "session.revoked_all_others", severity: "high", category: "session" });
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
