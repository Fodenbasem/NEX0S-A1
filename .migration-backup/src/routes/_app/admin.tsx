import { createFileRoute } from "@tanstack/react-router";
import { Brain, Cpu, Database, Zap, Users, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "AI Brain Admin · NEX0S A1" }] }),
  component: Admin,
});

async function modelRouting() {
  const { data, error } = await supabase.from("ai_requests").select("model").not("model", "is", null).limit(2000);
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: any) => { counts[r.model] = (counts[r.model] ?? 0) + 1; });
  return Object.entries(counts).map(([name, calls]) => ({ name, calls })).sort((a, b) => b.calls - a.calls);
}

async function activityCost() {
  const { data, error } = await supabase.from("activity_logs").select("action").limit(2000);
  if (error) throw error;
  const buckets = { Synthesis: 0, Security: 0, Consult: 0, Other: 0 };
  (data ?? []).forEach((r: any) => {
    if (r.action.startsWith("project")) buckets.Consult++;
    else if (r.action.startsWith("security")) buckets.Security++;
    else if (r.action.startsWith("deployment")) buckets.Synthesis++;
    else buckets.Other++;
  });
  const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
  const palette = ["oklch(0.78 0.18 200)", "oklch(0.65 0.22 305)", "oklch(0.78 0.18 155)", "oklch(0.82 0.17 80)"];
  return Object.entries(buckets).map(([name, v], i) => ({ name, value: Math.round((v / total) * 100), color: palette[i] }));
}

function Admin() {
  const statsQ = useQuery({ queryKey: ["dashboard-stats"], queryFn: api.dashboardStats });
  const activityQ = useQuery({ queryKey: ["ai-activity-24h"], queryFn: api.aiActivity24h });
  const modelsQ = useQuery({ queryKey: ["model-routing"], queryFn: modelRouting });
  const costQ = useQuery({ queryKey: ["cost-split"], queryFn: activityCost });

  const total24h = (activityQ.data ?? []).reduce((a, b) => a + b.requests, 0);
  const avgLat = (() => {
    const arr = (activityQ.data ?? []).filter(b => b.latency > 0);
    return arr.length ? Math.round(arr.reduce((a, b) => a + b.latency, 0) / arr.length) : 0;
  })();

  const kpis = [
    { icon: Users,      label: "Active projects",  value: statsQ.data?.activeProjects ?? 0 },
    { icon: Cpu,        label: "AI calls / 24h",   value: total24h },
    { icon: Zap,        label: "Avg latency",      value: `${avgLat}ms` },
    { icon: Database,   label: "Total AI requests", value: statsQ.data?.aiRequestCount ?? 0 },
    { icon: ShieldCheck,label: "Avg sec score",    value: statsQ.data?.avgSecurityScore ?? 0 },
    { icon: Brain,      label: "Deployments",      value: statsQ.data?.deploymentCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="AI Brain · Admin" title="System Telemetry" description="Routing, capacity and performance across the entire NEX0S A1 fabric." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <k.icon className="h-3.5 w-3.5 text-primary" /> {k.label}
              </div>
              {statsQ.isLoading ? <Skeleton className="mt-1 h-7 w-16" /> : <div className="mt-1 text-2xl font-bold">{k.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Model Routing</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            {modelsQ.isLoading ? <Skeleton className="h-full w-full" /> : (modelsQ.data ?? []).length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No AI calls recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelsQ.data}>
                  <CartesianGrid stroke="oklch(0.3 0.05 270 / 0.3)" vertical={false} />
                  <XAxis dataKey="name" stroke="oklch(0.7 0.03 250)" fontSize={11} />
                  <YAxis stroke="oklch(0.7 0.03 250)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "oklch(0.21 0.045 268)", border: "1px solid oklch(0.3 0.05 270)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="calls" fill="oklch(0.78 0.18 200)" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Activity Distribution</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            {costQ.isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costQ.data} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {(costQ.data ?? []).map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader><CardTitle className="text-base">System Health</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["API Gateway", "operational"],
            ["AI Gateway", "operational"],
            ["Postgres", "operational"],
            ["Edge Runtime", "operational"],
          ].map(([s, st]) => (
            <div key={s} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 p-3">
              <span className="text-sm">{s}</span>
              <span className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${st === "operational" ? "text-success" : "text-warning"}`}>
                <span className={`h-1.5 w-1.5 rounded-full pulse-glow ${st === "operational" ? "bg-success" : "bg-warning"}`} />
                {st}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
