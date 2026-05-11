import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Activity, AlertTriangle, AlertOctagon, Info, ShieldCheck, KeyRound, Cpu, Rocket, FolderKanban, UserCog, Monitor } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { securityApi, type AuditCategory, type AuditEvent, type AuditSeverity } from "@/services/security-api";

const sevTone: Record<AuditSeverity, string> = {
  info: "border-primary/30 bg-primary/10 text-primary",
  low: "border-muted-foreground/30 bg-muted/30 text-muted-foreground",
  medium: "border-warning/30 bg-warning/10 text-warning",
  high: "border-accent/40 bg-accent/10 text-accent",
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
};
const sevIcon: Record<AuditSeverity, React.ElementType> = {
  info: Info, low: Info, medium: AlertTriangle, high: AlertTriangle, critical: AlertOctagon,
};
const catIcon: Record<AuditCategory, React.ElementType> = {
  auth: KeyRound, mfa: ShieldCheck, session: Monitor, project: FolderKanban,
  ai: Cpu, deployment: Rocket, security: ShieldCheck, admin: UserCog, system: Activity,
};

export default function AuditPage() {
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const filters = useMemo(() => ({
    severity: severity === "all" ? undefined : (severity as AuditSeverity),
    category: category === "all" ? undefined : (category as AuditCategory),
  }), [severity, category]);

  const auditQ = useQuery({
    queryKey: ["audit", filters],
    queryFn: () => securityApi.listAudit({ ...filters, limit: 300 }),
    refetchInterval: 20_000,
  });

  const events = (auditQ.data ?? []).filter(e =>
    !q.trim() || e.action.toLowerCase().includes(q.toLowerCase()) ||
    JSON.stringify(e.metadata ?? {}).toLowerCase().includes(q.toLowerCase())
  );

  const stats = useMemo(() => {
    const all = auditQ.data ?? [];
    return {
      total: all.length,
      critical: all.filter(e => e.severity === "critical" || e.severity === "high").length,
      mfa: all.filter(e => e.category === "mfa").length,
      sessions: all.filter(e => e.category === "session").length,
    };
  }, [auditQ.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security · SOC"
        title="Audit Timeline"
        description="Realtime stream of every authentication, session, project, AI, deployment and admin event."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total events", value: stats.total, tone: "text-foreground" },
          { label: "High / Critical", value: stats.critical, tone: "text-destructive" },
          { label: "MFA events", value: stats.mfa, tone: "text-success" },
          { label: "Session events", value: stats.sessions, tone: "text-primary" },
        ].map((s) => (
          <Card key={s.label} className="glass"><CardContent className="p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
            <div className={`mt-1 text-2xl font-bold ${s.tone}`}>{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card className="glass">
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-border/50 bg-background/40 px-3 py-1.5 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search action or metadata…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(["auth","mfa","session","project","ai","deployment","security","admin","system"] as AuditCategory[]).map(c =>
                  <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-success pulse-glow" /> live
          </Badge>
        </CardContent>
      </Card>

      {auditQ.isLoading ? <Skeleton className="h-96 w-full" /> : events.length === 0 ? (
        <Card className="glass"><CardContent className="py-12 text-center text-muted-foreground">No events match these filters.</CardContent></Card>
      ) : (
        <Card className="glass scanline">
          <CardContent className="relative max-h-[640px] overflow-auto p-0">
            <div className="absolute left-[28px] top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-accent/30 to-transparent" />
            <ol className="relative space-y-1 p-4">
              <AnimatePresence initial={false}>
                {events.map(e => <TimelineItem key={e.id} event={e} />)}
              </AnimatePresence>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TimelineItem({ event }: { event: AuditEvent }) {
  const SevIcon = sevIcon[event.severity];
  const CatIcon = catIcon[event.category] ?? Activity;
  const ts = new Date(event.created_at);
  return (
    <motion.li
      layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
      className="relative flex gap-3 rounded-md px-2 py-2 hover:bg-muted/20"
    >
      <div className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background/80">
        <CatIcon className="h-3 w-3 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">{ts.toLocaleString([], { hour12: false })}</span>
          <Badge variant="outline" className={`${sevTone[event.severity]} h-5 px-1.5 text-[9px] uppercase tracking-widest`}>
            <SevIcon className="mr-0.5 h-2.5 w-2.5" />{event.severity}
          </Badge>
          <Badge variant="outline" className="h-5 border-border/50 bg-background/40 px-1.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            {event.category}
          </Badge>
          <span className="font-mono text-xs text-foreground">{event.action}</span>
        </div>
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <pre className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
            {JSON.stringify(event.metadata)}
          </pre>
        )}
      </div>
    </motion.li>
  );
}
