import { Router } from "express";
import { requireAdmin } from "../lib/auth";
import { isMongoConnected, mongoReadyState } from "../lib/mongodb";

const router = Router();

const STATE_LABELS: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
  99: "uninitialized",
};

router.get("/status/mongodb", requireAdmin, (_req, res) => {
  const state = mongoReadyState();
  res.json({
    connected: isMongoConnected(),
    readyState: state,
    label: STATE_LABELS[state] ?? "unknown",
  });
});

export default router;
