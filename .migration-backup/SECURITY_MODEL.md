# SECURITY_MODEL.md — NEX0S A1

## Trust Boundaries
| Layer | Identity | Privileges |
|------|----------|------------|
| Browser client (`@/integrations/supabase/client`) | Authenticated user via JWT | RLS-bound: only own rows |
| Edge functions (`ai-consultation`) | Verifies caller JWT | RLS-bound on inserts |
| `supabase.auth.admin` & `client.server` | Service role | Server-only; bypasses RLS |

## Data Tables (security-relevant)
- `profiles` — own only
- `projects` / `ai_requests` / `security_reports` / `deployments` — owner or admin
- `user_roles` — read self / admin only; never client-writable
- `activity_logs` — own + admin (insert: self only) — extended with `severity` + `category`
- `user_sessions` — own + admin
- `mfa_backup_codes` — own only

All tables have RLS enabled. The `has_role()` function is `SECURITY DEFINER` to avoid recursive RLS lookups (intentional & documented).

## Authentication
- Email + password (Supabase Auth, HIBP leaked-password protection enabled)
- Optional TOTP MFA (see MFA_FLOW.md)
- Sessions persisted in `user_sessions` (see SESSION_LIFECYCLE.md)

## OWASP Coverage
- **A01 Broken Access** → RLS on every table, role checked via `has_role()`
- **A02 Crypto** → Backup codes hashed (SHA-256 server-side via `crypto.subtle`), TLS only
- **A03 Injection** → Parameterized via Supabase JS; Zod validation in server fns
- **A05 Misconfig** → No service-role key in client bundle; `client.server.ts` server-only
- **A07 AuthN Failures** → MFA, HIBP password check, session-revocation flow
- **A09 Logging** → Every auth/MFA/session/project/AI/deployment event flows into `activity_logs` with severity + category

## Audit Pipeline
```
client action ──► securityApi.log() ──► INSERT activity_logs (severity, category, metadata)
                                            │
                                            └──► supabase_realtime broadcast
                                                          │
                                                          ▼
                                             /audit timeline subscribes per-user
```

## Rate-Limit Strategy
Supabase Auth enforces backoff on signin/signup at the platform layer. Sensitive UI actions (MFA enroll, regen codes, revoke-all) are debounced via local `busy` state.

## Secrets
- Runtime secrets (`LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) — never in client bundle
- Browser fingerprint (random UUID in `localStorage`) used as stable session token, not as a secret
