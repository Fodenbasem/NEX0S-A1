import { Router } from "express";
import { getAuth } from "@clerk/express";
import { requireAdmin } from "../lib/auth";
import { db, whitelistedUsersTable } from "@workspace/db";
import { eq, ilike, desc } from "drizzle-orm";

const router = Router();

router.get("/whitelist/check", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.json({ allowed: false, reason: "unauthenticated" });
      return;
    }
    const email = (req.query.email as string | undefined)?.toLowerCase().trim();
    if (!email) {
      res.json({ allowed: true, reason: "no_email" });
      return;
    }
    const [entry] = await db
      .select()
      .from(whitelistedUsersTable)
      .where(eq(whitelistedUsersTable.email, email))
      .limit(1);
    res.json({ allowed: !!entry });
  } catch (err) {
    console.error("[whitelist.check]", err instanceof Error ? err.message : err);
    res.json({ allowed: true });
  }
});

router.get("/whitelist", requireAdmin, async (req, res) => {
  try {
    const { q } = req.query as Record<string, string>;
    const users = q
      ? await db
          .select()
          .from(whitelistedUsersTable)
          .where(ilike(whitelistedUsersTable.email, `%${q}%`))
          .orderBy(desc(whitelistedUsersTable.createdAt))
          .limit(200)
      : await db
          .select()
          .from(whitelistedUsersTable)
          .orderBy(desc(whitelistedUsersTable.createdAt))
          .limit(200);
    res.json(users);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/whitelist", requireAdmin, async (req, res) => {
  try {
    const { email, note } = req.body as { email: string; note?: string };
    if (!email?.trim()) {
      res.status(400).json({ error: "email is required" });
      return;
    }
    const normalized = email.toLowerCase().trim();
    const [entry] = await db
      .insert(whitelistedUsersTable)
      .values({ email: normalized, addedBy: req.userId, note: note ?? "" })
      .onConflictDoUpdate({
        target: whitelistedUsersTable.email,
        set: { addedBy: req.userId, note: note ?? "", updatedAt: new Date() },
      })
      .returning();
    res.status(201).json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.delete("/whitelist/:id", requireAdmin, async (req, res) => {
  try {
    await db
      .delete(whitelistedUsersTable)
      .where(eq(whitelistedUsersTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
