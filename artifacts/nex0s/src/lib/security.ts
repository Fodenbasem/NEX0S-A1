// Security utilities — UA parsing, fingerprinting, backup-code generation/hashing.
// All client-safe (Web Crypto + DOM only). No secrets.

export interface UAInfo { browser: string; os: string; device: string; }

export function parseUA(ua: string): UAInfo {
  const u = ua.toLowerCase();
  let browser = "Unknown";
  if (u.includes("edg/")) browser = "Edge";
  else if (u.includes("chrome/") && !u.includes("edg/")) browser = "Chrome";
  else if (u.includes("firefox/")) browser = "Firefox";
  else if (u.includes("safari/") && !u.includes("chrome/")) browser = "Safari";
  else if (u.includes("opr/") || u.includes("opera")) browser = "Opera";

  let os = "Unknown";
  if (u.includes("windows")) os = "Windows";
  else if (u.includes("mac os x") || u.includes("macintosh")) os = "macOS";
  else if (u.includes("android")) os = "Android";
  else if (u.includes("iphone") || u.includes("ipad") || u.includes("ios")) os = "iOS";
  else if (u.includes("linux")) os = "Linux";

  let device = "Desktop";
  if (u.includes("mobile") || u.includes("iphone") || u.includes("android")) device = "Mobile";
  if (u.includes("ipad") || u.includes("tablet")) device = "Tablet";
  return { browser, os, device };
}

/** Stable per-browser fingerprint (not a true device ID — local storage based). */
export function getOrCreateFingerprint(): string {
  const k = "nex0s.fingerprint";
  let v = localStorage.getItem(k);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(k, v);
  }
  return v;
}

/** Best-effort public IP via a free, no-auth endpoint. Returns null on failure. */
export async function fetchPublicIP(): Promise<{ ip: string | null; location: string | null }> {
  try {
    const r = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(2500) });
    if (!r.ok) return { ip: null, location: null };
    const j = await r.json();
    return {
      ip: j.ip ?? null,
      location: [j.city, j.region, j.country_name].filter(Boolean).join(", ") || null,
    };
  } catch { return { ip: null, location: null }; }
}

/** Generate N human-readable backup codes (XXXX-XXXX). */
export function generateBackupCodes(n = 10): string[] {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const buf = new Uint8Array(8);
    crypto.getRandomValues(buf);
    let code = "";
    for (let j = 0; j < 8; j++) code += alphabet[buf[j] % alphabet.length];
    out.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return out;
}

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.toUpperCase().replace(/-/g, ""));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Compute a coarse risk score for a session (0-100). */
export function computeRisk(opts: { mfaVerified: boolean; ipKnown: boolean; ageMs: number }): number {
  let r = 0;
  if (!opts.mfaVerified) r += 40;
  if (!opts.ipKnown) r += 25;
  if (opts.ageMs > 1000 * 60 * 60 * 24 * 30) r += 15; // older than 30 days
  return Math.min(100, r);
}
