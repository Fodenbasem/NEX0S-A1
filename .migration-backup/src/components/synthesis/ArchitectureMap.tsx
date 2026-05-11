import { motion } from "framer-motion";
import { Globe, Server, Database, Shield, Cpu, Layers, Workflow } from "lucide-react";

interface Node { id: string; label: string; sub: string; icon: React.ElementType; x: number; y: number; tone: "primary" | "accent" | "success" | "warning"; }
interface Edge { from: string; to: string; label?: string; }

const FRONTEND_NODES: Node[] = [
  { id: "browser",  label: "Browser",         sub: "React 19 · TanStack",     icon: Globe,    x: 50,  y: 60,  tone: "primary" },
  { id: "router",   label: "Router",          sub: "File-based routes",       icon: Workflow, x: 240, y: 60,  tone: "primary" },
  { id: "layout",   label: "App Layout",      sub: "Sidebar · Header",        icon: Layers,   x: 430, y: 60,  tone: "accent" },
  { id: "pages",    label: "Pages",           sub: "Dashboard · Synthesis",   icon: Cpu,      x: 240, y: 180, tone: "accent" },
  { id: "ui",       label: "UI Components",   sub: "shadcn/ui · Tailwind",    icon: Layers,   x: 430, y: 180, tone: "primary" },
];
const FRONTEND_EDGES: Edge[] = [
  { from: "browser", to: "router" }, { from: "router", to: "layout" },
  { from: "layout", to: "pages" }, { from: "pages", to: "ui" }, { from: "router", to: "pages" },
];

const BACKEND_NODES: Node[] = [
  { id: "client",   label: "Client",       sub: "fetch + bearer JWT", icon: Globe,    x: 30,  y: 100, tone: "primary" },
  { id: "edge",     label: "Edge Runtime", sub: "Cloudflare Worker",  icon: Server,   x: 200, y: 60,  tone: "primary" },
  { id: "auth",     label: "Auth Middleware", sub: "JWT · RLS",       icon: Shield,   x: 200, y: 160, tone: "warning" },
  { id: "ai",       label: "AI Gateway",   sub: "Gemini · GPT",       icon: Cpu,      x: 380, y: 60,  tone: "accent" },
  { id: "db",       label: "Postgres",     sub: "RLS · Triggers",     icon: Database, x: 380, y: 160, tone: "success" },
];
const BACKEND_EDGES: Edge[] = [
  { from: "client", to: "edge", label: "HTTPS" },
  { from: "client", to: "auth", label: "JWT" },
  { from: "edge", to: "ai", label: "stream" },
  { from: "auth", to: "db", label: "RLS" },
  { from: "edge", to: "db" },
];

const toneClass: Record<Node["tone"], string> = {
  primary: "from-primary/30 to-primary/10 text-primary border-primary/40",
  accent:  "from-accent/30 to-accent/10 text-accent border-accent/40",
  success: "from-success/30 to-success/10 text-success border-success/40",
  warning: "from-warning/30 to-warning/10 text-warning border-warning/40",
};

function Graph({ nodes, edges, height }: { nodes: Node[]; edges: Edge[]; height: number }) {
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  return (
    <div className="relative w-full overflow-x-auto rounded-lg border border-border/40 bg-background/30">
      <div className="relative" style={{ width: 540, height }}>
        <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
          <defs>
            <linearGradient id="edge-grad" x1="0" x2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.18 200 / 0.7)" />
              <stop offset="100%" stopColor="oklch(0.65 0.22 305 / 0.7)" />
            </linearGradient>
            <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="oklch(0.65 0.22 305 / 0.8)" />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const a = byId[e.from], b = byId[e.to]; if (!a || !b) return null;
            const x1 = a.x + 70, y1 = a.y + 24, x2 = b.x + 10, y2 = b.y + 24;
            const mx = (x1 + x2) / 2;
            return (
              <g key={i}>
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: i * 0.08 }}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  stroke="url(#edge-grad)" strokeWidth="1.3" fill="none" markerEnd="url(#arr)"
                />
                {e.label && <text x={mx} y={(y1 + y2) / 2 - 4} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}>{e.label}</text>}
              </g>
            );
          })}
        </svg>
        {nodes.map((n, i) => {
          const Icon = n.icon;
          return (
            <motion.div
              key={n.id} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className={`absolute w-36 rounded-lg border bg-gradient-to-br ${toneClass[n.tone]} p-2.5 backdrop-blur-md shadow-lg`}
              style={{ left: n.x, top: n.y }}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold text-foreground">{n.label}</span>
              </div>
              <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">{n.sub}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function FrontendArchitectureMap() { return <Graph nodes={FRONTEND_NODES} edges={FRONTEND_EDGES} height={260} />; }
export function BackendArchitectureMap()  { return <Graph nodes={BACKEND_NODES} edges={BACKEND_EDGES} height={240} />; }
