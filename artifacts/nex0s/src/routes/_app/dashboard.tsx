import { motion } from "framer-motion";
import { Activity, Cpu, ShieldCheck, Rocket, ArrowUpRight, Sparkles, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/services/api";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatDistanceToNow } from "date-fns";

const statusColor: Record<string, string> = {
  deployed: "bg-success/15 text-success border-success/30",
  synthesizing: "bg-primary/15 text-primary border-primary/30",
  scanning: "bg-warning/15 text-warning border-warning/30",
  consulting: "bg-accent/15 text-accent border-accent/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function Dashboard() {
  const statsQ = useQuery({ queryKey: ["dashboard-stats"], queryFn: api.dashboardStats, refetchInterval: 30_000 });
  const activityQ = useQuery({ queryKey: ["ai-activity-24h"], queryFn: api.aiActivity24h, refetchInterval: 30_000 });
  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });

  const cards = [
    { label: "Active Projects", value: statsQ.data?.activeProjects ?? 0, icon: Activity },
    { label: "AI Requests", value: statsQ.data?.aiRequestCount ?? 0, icon: Cpu },
    { label: "Avg Security Score", value: statsQ.data?.avgSecurityScore ?? 0, icon: ShieldCheck },
    { label: "Deployments", value: statsQ.data?.deploymentCount ?? 0, icon: Rocket },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Mission Control"
        title="AI Brain Console"
        description="Real-time telemetry across consultation, synthesis, security and deployment pipelines."
        actions={
          <Link to="/consultation">
            <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow">
              <Sparkles className="mr-2 h-4 w-4" /> New Project
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <Card className="glass border-border/60">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</div>
                      {statsQ.isLoading
                        ? <Skeleton className="mt-2 h-8 w-16" />
                        : <div className="mt-2 text-3xl font-bold tracking-tight">{s.value}</div>}
                      <div className="mt-1 flex items-center gap-1 text-xs text-success">
                        <ArrowUpRight className="h-3 w-3" /> live
                      </div>
                    </div>
                    <div className="rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass lg:col-span-2">
          <CardHeader><CardTitle className="text-base">AI Activity · 24h</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {activityQ.isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityQ.data ?? []}>
                  <defs>
                    <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.78 0.18 200)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.78 0.18 200)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.65 0.22 305)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.65 0.22 305)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(0.3 0.05 270 / 0.3)" vertical={false} />
                  <XAxis dataKey="time" stroke="oklch(0.7 0.03 250)" fontSize={11} />
                  <YAxis stroke="oklch(0.7 0.03 250)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "oklch(0.21 0.045 268)", border: "1px solid oklch(0.3 0.05 270)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="requests" stroke="oklch(0.78 0.18 200)" strokeWidth={2} fill="url(#g1)" />
                  <Area type="monotone" dataKey="latency"  stroke="oklch(0.65 0.22 305)" strokeWidth={2} fill="url(#g2)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Pipeline Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(["consulting","synthesizing","scanning","deployed"] as const).map((st) => {
              const count = (projectsQ.data ?? []).filter(p => p.status === st).length;
              return (
                <div key={st} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0">
                  <span className="text-sm capitalize text-muted-foreground">{st}</span>
                  <span className="font-mono text-lg font-semibold text-primary">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Projects</CardTitle>
          <Link to="/synthesis" className="text-xs font-mono text-primary hover:underline">view all →</Link>
        </CardHeader>
        <CardContent>
          {projectsQ.isLoading ? <Skeleton className="h-40 w-full" /> :
           projectsQ.error ? (
             <div className="flex items-center gap-2 text-sm text-destructive">
               <AlertTriangle className="h-4 w-4" /> Failed to load projects.
             </div>
           ) : (projectsQ.data ?? []).length === 0 ? (
             <div className="py-10 text-center text-sm text-muted-foreground">
               No projects yet. <Link to="/consultation" className="text-primary hover:underline">Start a consultation →</Link>
             </div>
           ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-3">ID</th>
                    <th className="px-2 py-3">Project</th>
                    <th className="px-2 py-3">Status</th>
                    <th className="px-2 py-3">Lang</th>
                    <th className="px-2 py-3">Stack</th>
                    <th className="px-2 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(projectsQ.data ?? []).slice(0, 8).map((p) => (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{p.id.slice(0, 8)}</td>
                      <td className="px-2 py-3 font-medium">{p.name}</td>
                      <td className="px-2 py-3"><Badge variant="outline" className={statusColor[p.status]}>{p.status}</Badge></td>
                      <td className="px-2 py-3 font-mono text-xs">{p.language}</td>
                      <td className="px-2 py-3 text-muted-foreground">{p.stack ?? "—"}</td>
                      <td className="px-2 py-3 font-mono text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
