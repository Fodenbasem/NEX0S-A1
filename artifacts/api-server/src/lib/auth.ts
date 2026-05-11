import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

const adminEmailCache = new Map<string, { isAdmin: boolean; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    res.status(403).json({ error: "Admin not configured on server" });
    return;
  }

  const cached = adminEmailCache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    if (!cached.isAdmin) {
      res.status(403).json({ error: "Forbidden — admin only" });
      return;
    }
    req.userId = userId;
    next();
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress ?? "";
    const isAdmin = email.toLowerCase() === adminEmail.toLowerCase();
    adminEmailCache.set(userId, { isAdmin, ts: Date.now() });

    if (!isAdmin) {
      res.status(403).json({ error: "Forbidden — admin only" });
      return;
    }
    req.userId = userId;
    next();
  } catch {
    res.status(403).json({ error: "Forbidden" });
  }
}
