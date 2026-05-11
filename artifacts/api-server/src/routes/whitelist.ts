import { Router } from "express";
import { getAuth } from "@clerk/express";
import { requireAuth, requireAdmin } from "../lib/auth";
import { WhitelistedUser } from "../models/WhitelistedUser";
import { isMongoConnected } from "../lib/mongodb";

const router = Router();

router.get("/whitelist/check", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.json({ allowed: false, reason: "unauthenticated" });
      return;
    }
    if (!isMongoConnected()) {
      res.json({ allowed: true, reason: "mongo_unavailable" });
      return;
    }
    const email = (req.query.email as string | undefined)?.toLowerCase().trim();
    if (!email) {
      res.json({ allowed: true, reason: "no_email" });
      return;
    }
    const entry = await WhitelistedUser.findOne({ email }).maxTimeMS(3000);
    res.json({ allowed: !!entry });
  } catch (err) {
    console.error("[whitelist.check]", err instanceof Error ? err.message : err);
    res.json({ allowed: true });
  }
});

router.get("/whitelist", requireAdmin, async (req, res) => {
  if (!isMongoConnected()) {
    res.status(503).json({ error: "MongoDB not connected — whitelist unavailable" });
    return;
  }
  try {
    const { q } = req.query as Record<string, string>;
    const filter = q ? { email: { $regex: q, $options: "i" } } : {};
    const users = await WhitelistedUser.find(filter).sort({ createdAt: -1 }).limit(200).maxTimeMS(5000);
    res.json(users);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/whitelist", requireAdmin, async (req, res) => {
  if (!isMongoConnected()) {
    res.status(503).json({ error: "MongoDB not connected" });
    return;
  }
  try {
    const { email, note } = req.body as { email: string; note?: string };
    if (!email?.trim()) {
      res.status(400).json({ error: "email is required" });
      return;
    }
    const entry = await WhitelistedUser.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { email: email.toLowerCase().trim(), addedBy: req.userId, note: note ?? "" },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.status(201).json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.delete("/whitelist/:id", requireAdmin, async (req, res) => {
  if (!isMongoConnected()) {
    res.status(503).json({ error: "MongoDB not connected" });
    return;
  }
  try {
    await WhitelistedUser.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
