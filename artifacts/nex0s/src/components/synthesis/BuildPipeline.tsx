import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Circle, Sparkles, Layers, Database, Shield, Rocket, MessageSquare, Search } from "lucide-react";

const STAGES = [
  { key: "consultation", label: "Consultation",     icon: MessageSquare, range: [0, 5]   },
  { key: "analysis",     label: "Analysis",         icon: Search,        range: [5, 15]  },
  { key: "frontend",     label: "Frontend Synthesis", icon: Layers,      range: [15, 40] },
  { key: "backend",      label: "Backend Synthesis",  icon: Sparkles,    range: [40, 60] },
  { key: "database",     label: "Database Generation", icon: Database,   range: [60, 75] },
  { key: "security",     label: "Security Hardening",  icon: Shield,     range: [75, 90] },
  { key: "deployment",   label: "Deployment",          icon: Rocket,     range: [90, 100]},
] as const;

export function BuildPipeline({ progress, status }: { progress: number; status: string }) {
  return (
    <div className="glass relative overflow-hidden rounded-xl p-5">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live Build Pipeline</div>
            <div className="text-base font-semibold">Autonomous synthesis · <span className="text-primary">{progress}%</span></div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-accent">{status}</div>
        </div>

        <div className="relative">
          {/* connector */}
          <div className="absolute left-5 top-5 bottom-5 w-px bg-gradient-to-b from-primary/60 via-accent/40 to-transparent" />
          <div className="space-y-3">
            {STAGES.map((s, i) => {
              const [start, end] = s.range;
              const stageState = progress >= end ? "done" : progress > start ? "active" : "queued";
              const stagePct = stageState === "done" ? 100 : stageState === "active" ? Math.round(((progress - start) / (end - start)) * 100) : 0;
              const Icon = s.icon;
              const StatusIcon = stageState === "done" ? CheckCircle2 : stageState === "active" ? Loader2 : Circle;
              return (
                <motion.div
                  key={s.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="relative flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-3"
                >
                  <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    stageState === "done" ? "bg-success/20 text-success" :
                    stageState === "active" ? "bg-gradient-to-br from-primary/30 to-accent/30 text-primary glow" :
                    "bg-muted/40 text-muted-foreground"
                  }`}>
                    <Icon className="h-4 w-4" />
                    {stageState === "active" && <span className="absolute inset-0 rounded-lg ring-2 ring-primary/40 pulse-glow" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{s.label}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{stageState}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary/60">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${stagePct}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`h-full ${stageState === "done" ? "bg-success" : "bg-gradient-to-r from-primary to-accent"}`}
                      />
                    </div>
                  </div>
                  <StatusIcon className={`h-4 w-4 shrink-0 ${
                    stageState === "done" ? "text-success" :
                    stageState === "active" ? "text-primary animate-spin" : "text-muted-foreground/50"
                  }`} />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
