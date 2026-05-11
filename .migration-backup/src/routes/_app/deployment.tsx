import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Rocket, CheckCircle2, Loader2, Circle, ExternalLink, Globe } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/services/api";

export const Route = createFileRoute("/_app/deployment")({
  head: () => ({ meta: [{ title: "Deployment · NEX0S A1" }] }),
  component: Deployment,
});

function Deployment() {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string>("");
  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });
  const depsQ = useQuery({
    queryKey: ["deployments", projectId],
    queryFn: () => api.listDeployments(projectId || undefined),
  });

  useEffect(() => {
    if (!projectId && projectsQ.data?.[0]) setProjectId(projectsQ.data[0].id);
  }, [projectsQ.data, projectId]);

  const project = projectsQ.data?.find(p => p.id === projectId);
  const deployMut = useMutation({
    mutationFn: () => api.createDeployment(projectId, project?.name ?? "app"),
    onSuccess: () => {
      toast.success("Deployment promoted to production");
      qc.invalidateQueries({ queryKey: ["deployments"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const latest = (depsQ.data ?? [])[0] as any | undefined;
  const steps = (latest?.steps ?? []) as { label: string; status: string; time: string }[];
  const logs: string[] = String(latest?.logs ?? "").split("\n").filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 04 · Deployment"
        title="Autonomous Deployment"
        description="Containerize · migrate · warm · promote — with health-checked rollouts and instant rollback."
        actions={
          <div className="flex items-center gap-2">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {(projectsQ.data ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => deployMut.mutate()} disabled={!projectId || deployMut.isPending}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow">
              {deployMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
              Deploy Build
            </Button>
          </div>
        }
      />

      {depsQ.isLoading ? <Skeleton className="h-32 w-full" /> : !latest ? (
        <Card className="glass"><CardContent className="py-16 text-center text-muted-foreground">
          No deployments yet. Select a project and click Deploy Build.
        </CardContent></Card>
      ) : (
      <>
      <Card className="glass border-glow">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gradient-to-br from-success/30 to-primary/30 p-3 glow">
              <Globe className="h-6 w-6 text-success" />
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest text-success">{latest.status} · production</div>
              <div className="text-lg font-semibold">{project?.name}</div>
              <a href={latest.live_url} target="_blank" rel="noreferrer" className="font-mono text-sm text-primary hover:underline">{latest.live_url}</a>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-primary/40" asChild>
              <a href={latest.live_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-3.5 w-3.5" /> Open</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Deployment Pipeline</CardTitle></CardHeader>
          <CardContent>
            <ol className="relative space-y-5 pl-6">
              <span className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />
              {steps.map((step, i) => {
                const isDone = step.status === "complete";
                const isRun = step.status === "running";
                return (
                  <motion.li key={step.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="relative">
                    <span className="absolute -left-6 top-0.5">
                      {isDone ? <CheckCircle2 className="h-5 w-5 text-success" />
                        : isRun ? <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </span>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{step.label}</div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{step.status}</div>
                      </div>
                      <Badge variant="outline" className="font-mono text-[11px]">{step.time}</Badge>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <Card className="glass scanline">
          <CardHeader><CardTitle className="text-base">Live Logs</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg bg-background/80 p-3 font-mono text-[11px] leading-relaxed">
              {logs.map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }} className="text-foreground/85">{l}</motion.div>
              ))}
              <div className="mt-1 inline-block h-3 w-1.5 animate-pulse bg-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Deployment History</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(depsQ.data ?? []).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 p-3 text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-success/15 text-success border-success/30">{d.status}</Badge>
                  <a href={d.live_url} target="_blank" rel="noreferrer" className="font-mono text-xs text-primary hover:underline">{d.live_url}</a>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </>)}
    </div>
  );
}
