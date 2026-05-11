import { fetchPublicIP, generateBackupCodes, getOrCreateFingerprint, parseUA, sha256 } from "@/lib/security";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiUrl(path: string) {
  return `${BASE}/api${path}`;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    try { throw new Error(JSON.parse(text).error || text); }
    catch { throw new Error(text || `API error (${res.status})`); }
  }
  return res;
}

export type AuditSeverity = "info" | "low" | "medium" | "high" | "critical";
export type AuditCategory = "auth" | "mfa" | "session" | "project" | "ai" | "deployment" | "security" | "admin" | "system";

export interface UserSession {
  id: string; user_id: string; session_token: string;
  user_agent: string | null; browser: string | null; os: string | null; device: string | null;
  ip_address: string | null; location: string | null;
  mfa_verified: boolean; risk_score: number;
  created_at: string; last_seen_at: string; revoked_at: string | null;
}

export interface AuditEvent {
  id: string; user_id: string; project_id: string | null;
  action: string; metadata: any;
  severity: AuditSeverity; category: AuditCategory;
  created_at: string;
}

export const securityApi = {
  async log(action: string, opts: { severity?: AuditSeverity; category?: AuditCategory; projectId?: string | null; metadata?: Record<string, unknown> } = {}) {
    apiFetch("/activity", { method: "POST", body: JSON.stringify({
      project_id: opts.projectId ?? null, action,
      severity: opts.severity ?? "info", category: opts.category ?? "system",
      metadata: opts.metadata ?? null,
    }) }).catch(() => {});
  },

  async listAudit(filters: { severity?: AuditSeverity; category?: AuditCategory; q?: string; limit?: number } = {}): Promise<AuditEvent[]> {
    const params = new URLSearchParams();
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.category) params.set("category", filters.category);
    if (filters.q) params.set("q", filters.q);
    if (filters.limit) params.set("limit", String(filters.limit));
    const res = await apiFetch(`/audit?${params}`);
    return res.json();
  },

  async upsertCurrentSession(): Promise<UserSession | null> {
    try {
      const token = getOrCreateFingerprint();
      const ua = navigator.userAgent;
      const { browser, os, device } = parseUA(ua);
      const { ip, location } = await fetchPublicIP();
      const res = await apiFetch("/sessions/upsert", { method: "POST", body: JSON.stringify({
        session_token: token, user_agent: ua, browser, os, device, ip_address: ip, location,
      }) });
      return res.json();
    } catch { return null; }
  },

  async listSessions(): Promise<UserSession[]> {
    const res = await apiFetch("/sessions");
    return res.json();
  },

  async revokeSession(id: string) {
    await apiFetch(`/sessions/${id}/revoke`, { method: "POST" });
    await securityApi.log("session.revoked", { severity: "medium", category: "session", metadata: { id } });
  },

  async revokeAllOtherSessions() {
    const current = getOrCreateFingerprint();
    await apiFetch("/sessions/revoke-others", { method: "POST", body: JSON.stringify({ current_token: current }) });
    await securityApi.log("session.revoked_all_others", { severity: "high", category: "session" });
  },

  // MFA not supported by Clerk — stub implementations
  async mfaListFactors() {
    return { all: [], totp: [] };
  },

  async mfaEnrollStart(): Promise<{ factorId: string; qr: string; secret: string; uri: string }> {
    throw new Error("MFA TOTP enrollment is not supported in this version.");
  },

  async mfaEnrollVerify(_factorId: string, _code: string) {
    throw new Error("MFA TOTP not supported.");
  },

  async mfaUnenroll(_factorId: string) {
    throw new Error("MFA TOTP not supported.");
  },

  async generateAndStoreBackupCodes(): Promise<string[]> {
    throw new Error("MFA backup codes not supported.");
  },

  async countRemainingBackupCodes(): Promise<number> {
    return 0;
  },

  async consumeBackupCode(_code: string): Promise<boolean> {
    return false;
  },
};
