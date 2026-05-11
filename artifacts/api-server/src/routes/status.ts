import { Router } from "express";
import { requireAdmin } from "../lib/auth";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/status/mongodb", requireAdmin, async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ connected: true, readyState: 1, label: "connected" });
  } catch {
    res.json({ connected: false, readyState: 0, label: "disconnected" });
  }
});

export default router;
