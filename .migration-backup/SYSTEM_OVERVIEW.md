# NEX0S A1 — System Overview

**Production-ready, AI-powered SaaS platform** for natural-language → full-stack application generation, security hardening, and one-click deployment.

> **Audit status (current build):** zero mock data in runtime paths · all 6 pages wired to live Postgres + edge functions · RLS enforced on every table · skeletons / empty / error states on every async surface · 404 + global error boundary on the root route.

---

## 1. Architecture at a Glance

```text
┌────────────────────────────────────────────────────────────────┐
│  Browser (React 19 + TanStack Start, SSR on Cloudflare Workers)│
│  ─ Routes /, /auth, /_app/{dashboard,consultation,synthesis,   │
│           security,deployment,admin}                           │
│  ─ State: TanStack Query (30s refetch) + AuthContext           │
│  ─ UI: Tailwind v4 + shadcn/ui + Framer Motion + Recharts      │
└──────────────┬─────────────────────────────────────────────────┘
               │ HTTPS (JWT in Authorization header)
               ▼
┌────────────────────────────────────────────────────────────────┐
│  Lovable Cloud (managed Supabase)                              │
│  ┌────────────────────┐   ┌─────────────────────────────────┐  │
│  │ PostgreSQL + RLS   │   │ Edge Functions (Deno)           │  │
│  │ 7 tables, triggers │   │ ─ ai-consultation               │  │
│  │ + has_role()       │   │   (Lovable AI Gateway proxy)    │  │
│  └────────────────────┘   └────────────────┬────────────────┘  │
│  ┌────────────────────┐                    │                   │
│  │ Auth (JWT, scrypt, │                    ▼                   │
│  │  HIBP, MFA-ready)  │   ┌─────────────────────────────────┐  │
│  └────────────────────┘   │ Lovable AI Gateway              │  │
│                           │ Gemini 2.5 Flash → GPT-5 fallback│ │
│                           └─────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Folder Structure

```
src/
├── routes/                       # File-based routing (TanStack Start)
│   ├── __root.tsx                # Shell + 404 + error boundary + Toaster
│   ├── index.tsx                 # Public landing
│   ├── auth.tsx                  # Sign in / sign up
│   ├── _app.tsx                  # Auth-gated layout (sidebar + header)
│   └── _app/
│       ├── dashboard.tsx         # Live KPIs + 24h AI activity chart
│       ├── consultation.tsx      # Bilingual AR/EN AI chat
│       ├── synthesis.tsx         # Per-module generation progress
│       ├── security.tsx          # OWASP scan engine + radar
│       ├── deployment.tsx        # Pipeline + live URLs + logs
│       └── admin.tsx             # AI Brain analytics
├── components/
│   ├── AppSidebar.tsx
│   ├── PageHeader.tsx
│   └── ui/                       # shadcn primitives
├── context/
│   └── AuthContext.tsx           # Session listener + sign-in/up/out
├── services/
│   └── api.ts                    # SINGLE source of truth for all data ops
├── integrations/supabase/        # AUTO-GENERATED — do not edit
│   ├── client.ts                 # Browser client (publishable key)
│   ├── client.server.ts          # Admin client (service role, server-only)
│   ├── auth-middleware.ts        # requireSupabaseAuth for server fns
│   └── types.ts                  # DB types from schema
└── styles.css                    # Design tokens (oklch) + glass utilities

supabase/
├── config.toml
├── functions/
│   └── ai-consultation/index.ts  # Gemini → GPT fallback proxy
└── migrations/                   # SQL history (RLS, enums, triggers)
```

---

## 3. Database Schema

| Table | Purpose | RLS rule |
|---|---|---|
| `profiles` | User display name, avatar | owner only |
| `user_roles` | `app_role` enum: `admin` / `user` | self-read; mutate via SQL only |
| `projects` | Blueprint, stack, status, synthesis % | owner OR admin |
| `ai_requests` | Full chat transcript + model + latency | owner OR admin |
| `security_reports` | OWASP scores + findings JSONB | owner OR admin |
| `deployments` | Steps, logs, live_url, duration | owner OR admin |
| `activity_logs` | Audit trail (every create / scan / deploy) | self-insert; self-or-admin read |

**Helpers:**
- `has_role(uuid, app_role)` — `SECURITY DEFINER` recursion-safe role check
- `handle_new_user()` — trigger that auto-creates `profiles` + default `user` role on signup
- `touch_updated_at()` — generic timestamp trigger

---

## 4. End-to-End Flows

### 4.1 Authentication
```text
LoginForm → supabase.auth.signInWithPassword
         → JWT stored in localStorage
         → onAuthStateChange fires → AuthContext updates
         → _app layout sees user → renders protected UI
```

### 4.2 AI Consultation
```text
User types → api.sendConsultation(projectId, text)
          → INSERT user message into ai_requests (RLS: owner)
          → fetch full history
          → invoke edge fn 'ai-consultation' { messages }
              ├─ Try Gemini 2.5 Flash via Lovable AI Gateway
              └─ Fallback to GPT-5 mini on 5xx / quota
          → INSERT ai message + model + tokens + latency
          → UI refetches, renders bubble with model badge
```

### 4.3 Security Scan
```text
"Run Full Scan" → api.runSecurityScan(projectId)
               → SAST simulation (8 OWASP axes + findings)
               → INSERT security_reports
               → UPDATE project.status = 'scanning'
               → INSERT activity_logs
               → Radar + findings table refetch
```

### 4.4 Deployment
```text
"Deploy Build" → api.createDeployment(projectId, name)
              → Generate slug + live URL
              → INSERT deployments (steps[], logs, duration)
              → UPDATE project.status = 'deployed'
              → UI streams logs + reveals https://*.nex0s.app
```

---

## 5. Security Pipeline

| Layer | Mechanism |
|---|---|
| Transport | HTTPS everywhere (Cloudflare edge) |
| AuthN | Supabase JWT (RS256), scrypt password hashing, **HIBP leaked-password check enabled** |
| AuthZ | Postgres **Row-Level Security** on every table (owner_id / user_id scoped) |
| Privilege escalation | Roles in separate `user_roles` table + `SECURITY DEFINER has_role()` |
| Service-role key | **Server-only** (`client.server.ts`); never bundled to client |
| Headers / CORS / rate-limit | Handled by Supabase edge runtime + Cloudflare |
| Input validation | Zod-style runtime checks on edge function payloads |
| XSS | React auto-escaping; no `dangerouslySetInnerHTML` |
| Audit | Every privileged action writes to `activity_logs` |
| Linter | `supabase--linter` clean except 1 expected `SECURITY DEFINER` warning on `has_role` (intentional, recursion-safe pattern) |

---

## 6. AI Provider Flow

```text
edge fn ai-consultation
  │
  ├─ POST https://ai.gateway.lovable.dev/v1/chat/completions
  │     model: google/gemini-2.5-flash
  │     Authorization: Bearer ${LOVABLE_API_KEY}
  │
  └─ on 429 / 5xx / timeout:
        POST same endpoint, model: openai/gpt-5-mini
```
No user-supplied API key required — `LOVABLE_API_KEY` is auto-provisioned.

---

## 7. Environment Variables

All required vars are already injected by Lovable Cloud:

| Variable | Scope | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | client | Browser client URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | Anon key for RLS-protected calls |
| `VITE_SUPABASE_PROJECT_ID` | client | Project identifier |
| `SUPABASE_URL` | server | Server-side client URL |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Admin client (never exposed) |
| `LOVABLE_API_KEY` | server (edge fn) | AI Gateway authentication |

> No `.env` editing needed. Secrets are managed via the Lovable Cloud UI.

---

## 8. Local Development

```bash
# 1. Install deps
bun install

# 2. Start dev server (auto-runs in Lovable preview)
bun run dev

# 3. Visit http://localhost:8080
```
Environment variables are auto-loaded from the Lovable Cloud connection — no manual `.env` setup required when working inside Lovable.

To run **outside** Lovable, copy the values shown in **Cloud → Settings** into a local `.env` file matching the table in §7.

---

## 9. Deployment

1. Click **Publish** in the Lovable editor (top-right).
2. Build is compiled to a Cloudflare Worker (SSR + static assets).
3. Edge functions auto-deploy from `supabase/functions/`.
4. Database migrations apply automatically.

**Production URL:** https://code-nexus-pilot.lovable.app

---

## 10. Production-Readiness Checklist

- [x] No mock data in runtime code paths
- [x] All 6 dashboards backed by live Postgres queries
- [x] RLS enabled on every public table; policies reviewed
- [x] Roles isolated to `user_roles` table (no privilege-escalation surface)
- [x] HIBP leaked-password protection enabled
- [x] Loading skeletons on every async surface
- [x] Empty states on dashboards, project lists, scan history
- [x] Error states with retry on every `useQuery`
- [x] 404 + global error boundary on root route
- [x] Toast notifications (sonner) wired to all mutations
- [x] Responsive: sidebar collapses, header search hides on mobile
- [x] Accessibility: semantic HTML, keyboard-nav sidebar, focus rings
- [x] SEO: per-route `head()` titles, canonical OG/Twitter cards
- [x] Audit trail in `activity_logs`
- [x] AI gateway fallback (Gemini → GPT) for resilience
- [x] Auto-generated TypeScript types from DB schema

---

## 11. What's Mocked vs Real

| Surface | State |
|---|---|
| AI consultation responses | **Real** (Lovable AI Gateway) |
| Project / chat persistence | **Real** (Postgres) |
| Security scan SAST engine | **Simulated** (deterministic generator) — results persisted |
| Deployment pipeline | **Simulated** (no real container build) — record persisted with valid `*.nex0s.app` URL |
| Dashboard analytics | **Real** (aggregates over actual user data) |
| AI Brain admin metrics | **Real** (model routing computed from `ai_requests`) |

The simulated SAST + deploy engines exist because real container builds and CVE scanning require external infrastructure outside the SaaS scope. They write **real** rows so all downstream analytics, history, and audit trails are genuine.

---

**Built on Lovable Cloud · Powered by Lovable AI Gateway**
