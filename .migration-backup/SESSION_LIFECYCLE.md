# SESSION_LIFECYCLE.md

## Identity
Each browser is identified by a stable `session_token` = random UUID stored in `localStorage` under `nex0s.fingerprint`. This is **not a secret**; it just lets us deduplicate session rows for the same browser. Real auth is JWT-based via Supabase Auth.

## Lifecycle
```
SIGNED_IN event (AuthContext)
        │
        ▼
securityApi.upsertCurrentSession()
   ├─► fingerprint = localStorage UUID (created on first visit)
   ├─► parseUA(navigator.userAgent) → { browser, os, device }
   ├─► fetchPublicIP() → { ip, location }    (best-effort, 2.5s timeout)
   ├─► mfa.listFactors() → mfa_verified
   └─► UPSERT user_sessions (by session_token)
        ├─ existing → UPDATE last_seen_at, ip, location, mfa_verified, revoked_at=null
        └─ new      → INSERT + audit "session.started"

SIGNED_OUT event
        │
        ▼
session row stays for history (audit trail)
```

## Revocation
| Action | Effect |
|--------|--------|
| Revoke single | `UPDATE user_sessions SET revoked_at=now() WHERE id=$1` + audit `session.revoked` (medium) |
| Revoke all others | All rows except current fingerprint, server-side via RLS-bound update + audit `session.revoked_all_others` (high) |

Revoked rows are hidden from the dashboard (`WHERE revoked_at IS NULL`) but remain available to admins for forensics.

## Risk Score (computed client-side)
```
risk = 0
+40 if !mfa_verified
+25 if !ip_address
+15 if age > 30 days
clamp 0–100
```
Renders as success / warning / destructive badge.

## Realtime
`supabase_realtime` publication includes `user_sessions` and `activity_logs`. The `/sessions` and `/audit` pages subscribe per-user channels and invalidate the TanStack Query cache on changes.

## RLS
| Operation | Allowed for |
|-----------|-------------|
| SELECT | `auth.uid() = user_id` OR admin |
| INSERT | `auth.uid() = user_id` (own row only) |
| UPDATE | `auth.uid() = user_id` |
| DELETE | `auth.uid() = user_id` |

Combined with the unique index on `session_token`, this prevents cross-user session forgery.
