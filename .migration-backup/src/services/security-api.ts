// Security service layer: sessions, MFA backup codes, audit logging.
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicIP, generateBackupCodes, getOrCreateFingerprint, parseUA, sha256 } from "@/lib/security";

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
  // ==================== AUDIT ====================
  async log(action: string, opts: { severity?: AuditSeverity; category?: AuditCategory; projectId?: string | null; metadata?: Record<string, unknown> } = {}) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("activity_logs").insert({
      user_id: auth.user.id,
      project_id: opts.projectId ?? null,
      action,
      severity: opts.severity ?? "info",
      category: opts.category ?? "system",
      metadata: (opts.metadata ?? null) as any,
    });
  },

  async listAudit(filters: { severity?: AuditSeverity; category?: AuditCategory; q?: string; limit?: number } = {}): Promise<AuditEvent[]> {
    let q = supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(filters.limit ?? 200);
    if (filters.severity) q = q.eq("severity", filters.severity);
    if (filters.category) q = q.eq("category", filters.category);
    if (filters.q) q = q.ilike("action", `%${filters.q}%`);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as AuditEvent[];
  },

  // ==================== SESSIONS ====================
  /** Register or refresh the current browser's session row. Idempotent on session_token. */
  async upsertCurrentSession(): Promise<UserSession | null> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const token = getOrCreateFingerprint();
    const ua = navigator.userAgent;
    const { browser, os, device } = parseUA(ua);
    const { ip, location } = await fetchPublicIP();

    // Check MFA factor status
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const mfaVerified = (factors?.totp ?? []).some(f => f.status === "verified");

    const { data: existing } = await supabase.from("user_sessions")
      .select("*").eq("session_token", token).eq("user_id", auth.user.id).maybeSingle();

    if (existing) {
      const { data, error } = await supabase.from("user_sessions").update({
        last_seen_at: new Date().toISOString(),
        ip_address: ip ?? existing.ip_address,
        location: location ?? existing.location,
        mfa_verified: mfaVerified,
        revoked_at: null,
      }).eq("id", existing.id).select().single();
      if (error) throw error;
      return data as UserSession;
    }

    const { data, error } = await supabase.from("user_sessions").insert({
      user_id: auth.user.id, session_token: token,
      user_agent: ua, browser, os, device,
      ip_address: ip, location, mfa_verified: mfaVerified, risk_score: 0,
    }).select().single();
    if (error) throw error;
    await securityApi.log("session.started", {
      severity: "info", category: "session",
      metadata: { browser, os, device, ip, location },
    });
    return data as UserSession;
  },

  async listSessions(): Promise<UserSession[]> {
    const { data, error } = await supabase.from("user_sessions")
      .select("*").is("revoked_at", null).order("last_seen_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as UserSession[];
  },

  async revokeSession(id: string) {
    const { error } = await supabase.from("user_sessions")
      .update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    await securityApi.log("session.revoked", { severity: "medium", category: "session", metadata: { id } });
  },

  async revokeAllOtherSessions() {
    const current = getOrCreateFingerprint();
    const { error } = await supabase.from("user_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .is("revoked_at", null).neq("session_token", current);
    if (error) throw error;
    await securityApi.log("session.revoked_all_others", { severity: "high", category: "session" });
  },

  // ==================== MFA ====================
  /** Begin TOTP enrollment — returns QR + secret to display. */
  async mfaEnrollStart() {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `NEX0S · ${new Date().toLocaleDateString()}` });
    if (error) throw error;
    return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri };
  },

  /** Verify the 6-digit code to complete enrollment. */
  async mfaEnrollVerify(factorId: string, code: string) {
    const ch = await supabase.auth.mfa.challenge({ factorId });
    if (ch.error) throw ch.error;
    const v = await supabase.auth.mfa.verify({ factorId, challengeId: ch.data.id, code });
    if (v.error) throw v.error;
    await securityApi.log("mfa.enrolled", { severity: "high", category: "mfa" });
    return v.data;
  },

  async mfaListFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    return data;
  },

  async mfaUnenroll(factorId: string) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
    // Clear backup codes too
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) await supabase.from("mfa_backup_codes").delete().eq("user_id", auth.user.id);
    await securityApi.log("mfa.disabled", { severity: "high", category: "mfa" });
  },

  /** Generate + persist hashed backup codes. Returns plain codes ONCE. */
  async generateAndStoreBackupCodes(): Promise<string[]> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");
    await supabase.from("mfa_backup_codes").delete().eq("user_id", auth.user.id);
    const codes = generateBackupCodes(10);
    const rows = await Promise.all(codes.map(async c => ({
      user_id: auth.user!.id, code_hash: await sha256(c),
    })));
    const { error } = await supabase.from("mfa_backup_codes").insert(rows);
    if (error) throw error;
    await securityApi.log("mfa.backup_codes_generated", { severity: "medium", category: "mfa" });
    return codes;
  },

  async countRemainingBackupCodes(): Promise<number> {
    const { count } = await supabase.from("mfa_backup_codes")
      .select("*", { count: "exact", head: true }).is("used_at", null);
    return count ?? 0;
  },

  /** Consume a backup code (mark used). Returns true if valid + unused. */
  async consumeBackupCode(code: string): Promise<boolean> {
    const hash = await sha256(code);
    const { data } = await supabase.from("mfa_backup_codes")
      .select("id").eq("code_hash", hash).is("used_at", null).maybeSingle();
    if (!data) return false;
    await supabase.from("mfa_backup_codes").update({ used_at: new Date().toISOString() }).eq("id", data.id);
    await securityApi.log("mfa.backup_code_used", { severity: "high", category: "mfa" });
    return true;
  },
};
