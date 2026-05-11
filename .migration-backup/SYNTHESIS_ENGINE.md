# SYNTHESIS_ENGINE.md — NEX0S A1 Visualization Engine

## Purpose
The Synthesis route is the visual centerpiece of NEX0S A1. It renders the autonomous AI build pipeline, generated project structure, system architecture, and live database schema for the active project — driven entirely by real Supabase data.

## Modules
| File | Responsibility |
|------|----------------|
| `src/routes/_app/synthesis.tsx` | Orchestrator: project switcher, realtime subscriptions, layout |
| `src/components/synthesis/BuildPipeline.tsx` | 7-stage cinematic pipeline driven by `projects.synthesis_progress` |
| `src/components/synthesis/AITerminal.tsx` | Cyberpunk SSE-style terminal panel with auto-scroll & blinking caret |
| `src/components/synthesis/FileTree.tsx` | Animated expand/collapse project tree, derived from `projects.stack` |
| `src/components/synthesis/ArchitectureMap.tsx` | SVG node-graph for Frontend & Backend with animated edges + arrows |
| `src/components/synthesis/SchemaViewer.tsx` | Searchable RLS-aware schema cards with PK/FK indicators |

## Data Flow
```
                ┌────────────────┐
                │  Supabase DB   │
                └──────┬─────────┘
   projects ◀──────────┤  (poll 8s via TanStack Query)
   activity_logs ◀─────┤  realtime channel `synth-{projectId}`
   ai_requests ◀───────┤  realtime channel `synth-{projectId}`
                       ▼
            ┌──────────────────────┐
            │  synthesis.tsx       │
            │  • derive tree(stack)│
            │  • derive terminal() │
            │  • derive pipeline % │
            └──┬─────────┬─────────┘
   ┌───────────┘         │
   ▼                     ▼
BuildPipeline       AITerminal      SchemaViewer
FileTree            ArchitectureMap
```

## Build Pipeline Logic
`projects.synthesis_progress` (0–100) is mapped to 7 stages with explicit ranges:
`Consultation 0–5 · Analysis 5–15 · Frontend 15–40 · Backend 40–60 · Database 60–75 · Security 75–90 · Deployment 90–100`.
Each stage computes its own `done | active | queued` state and an interpolated percentage. The active stage receives an animated pulse ring + spinner.

## Terminal Stream
Reads `activity_logs` + `ai_requests` for the active project, classifies entries (`ok` / `warn` / `ai` / `sys` / `info`), then sorts by timestamp. New rows arrive via Supabase realtime `postgres_changes` and append in real time.

## Architecture Maps
SVG-based node graphs with animated `pathLength` edges, gradient stroke (cyan→violet), arrow markers, and motion-driven node entrance. Two views (Frontend / Backend) plus a Request Flow strip.

## File Tree
Recursive component with framer-motion height animations, file-type icons (jsonb/sql/md/auth/ai/deploy), depth-based indentation, and a synthesized layout that branches on `stack` (Postgres → SQL migrations).

## Schema Viewer
Static, RLS-aware representation of the live Postgres schema (7 tables). Search filters by table or field name. PKs marked with key icon, FKs with link icon. Each card shows the RLS badge.

## Performance
- TanStack Query handles cache + 8s polling for project list
- Realtime is scoped to the active project channel only and torn down on switch
- File tree state is local per-node; collapsed branches don't render children
- SVG graphs are static once mounted (animation runs once)

## Extending
- Add a new pipeline stage: edit `STAGES` in `BuildPipeline.tsx` (ranges must be contiguous).
- Add a node to a graph: append to `FRONTEND_NODES` / `BACKEND_NODES` and corresponding `EDGES`.
- Add a table to schema viewer: append to `TABLES` in `SchemaViewer.tsx`.
