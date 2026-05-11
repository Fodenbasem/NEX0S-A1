import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, Lock, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/services/api";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_app/security")({
  head: () => ({ meta: [{ title: "Security Hardening · NEX0S A1" }] }),
  component: Security,
});

const sevColor: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  high: "bg-warning/15 text-warning border-warning/40",
  medium: "bg-accent/15 text-accent border-accent/40",
  low: "bg-primary/15 text-primary border-primary/40",
};

function Security() {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string>("");
  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });
  const reportsQ = useQuery({
    queryKey: ["security-reports", projectId],
    queryFn: () => api.listSecurityReports(projectId || undefined),
  });

  useEffect(() => {
    if (!projectId && projectsQ.data?.[0]) setProjectId(projectsQ.data[0].id);
  }, [projectsQ.data, projectId]);

  const scanMut = useMutation({
    mutationFn: () => api.runSecurityScan(projectId),
    onSuccess: () => {
      toast.success("Security scan complete");
      qc.invalidateQueries({ queryKey: ["security-reports"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const latest = (reportsQ.data ?? [])[0] as any | undefined;
  const owasp = (latest?.owasp_scores ?? []) as { name: string; score: number }[];
  const findings = (latest?.findings ?? []) as { id: string; severity: string; title: string; patched: boolean }[];
  const totalScore = latest?.composite_score ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 03 · Hardening"
        title="Security Hardening Suite"
        description="SAST analysis, OWASP Top-10 alignment and automated patch suggestions."
        actions={
          <div className="flex items-center gap-2">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {(projectsQ.data ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              onClick={() => scanMut.mutate()}
              disabled={!projectId || scanMut.isPending}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow"
            >
              {scanMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Run Full Scan
            </Button>
          </div>
        }
      />

      {reportsQ.isLoading ? <Skeleton className="h-64 w-full" /> : !latest ? (
        <Card className="glass"><CardContent className="py-16 text-center text-muted-foreground">
          No scans yet. Select a project and run your first scan.
        </CardContent></Card>
      ) : (
      <>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass border-glow">
          <CardContent className="p-6 text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Composite Security Score</div>
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="my-3 text-6xl font-bold text-gradient">
              {totalScore}
            </motion.div>
            <div className="font-mono text-xs text-success">latest scan</div>
          </CardContent>
        </Card>

        <Card className="glass lg:col-span-2">
          <CardHeader><CardTitle className="text-base">OWASP Top-10 Posture</CardTitle></CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={owasp}>
                <PolarGrid stroke="oklch(0.3 0.05 270 / 0.5)" />
                <PolarAngleAxis dataKey="name" tick={{ fill: "oklch(0.7 0.03 250)", fontSize: 10 }} />
                <Radar dataKey="score" stroke="oklch(0.78 0.18 200)" fill="oklch(0.78 0.18 200)" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" /> Vulnerability Findings
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {findings.filter(v => v.patched).length}/{findings.length} patched
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {findings.map((v, i) => (
              <motion.div key={v.id + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={sevColor[v.severity]}>{v.severity}</Badge>
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{v.id}</div>
                    <div className="text-sm">{v.title}</div>
                  </div>
                </div>
                {v.patched ? (
                  <Badge className="bg-success/15 text-success border border-success/30"><Lock className="mr-1 h-3 w-3" /> patched</Badge>
                ) : (
                  <Button size="sm" variant="outline" className="border-warning/40 text-warning">Apply patch</Button>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
      </>)}
    </div>
  );
}
