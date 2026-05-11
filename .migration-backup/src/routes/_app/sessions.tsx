import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Monitor, Smartphone, Tablet, MapPin, Clock, ShieldCheck, ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { securityApi, type UserSession } from "@/services/security-api";
import { computeRisk, getOrCreateFingerprint } from "@/lib/security";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/sessions")({
  head: () => ({ meta: [{ title: "Sessions · NEX0S A1" }] }),
  component: SessionsPage,
});

const deviceIcon = (d: string | null) => d === "Mobile" ? Smartphone : d === "Tablet" ? Tablet : Monitor;
const fmtRel = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
};

function SessionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fp = useMemo(() => getOrCreateFingerprint(), []);
  const sessionsQ = useQuery({ queryKey: ["user-sessions"], queryFn: securityApi.listSessions, refetchInterval: 15_000 });

  // Realtime — refresh on any session row change for this user
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`sessions-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_sessions", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["user-sessions"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const sessions = sessionsQ.data ?? [];
  const current = sessions.find(s => s.session_token === fp);
  const others = sessions.filter(s => s.session_token !== fp);

  const revoke = async (id: string) => {
    try { await securityApi.revokeSession(id); toast.success("Session revoked"); }
    catch (e: any) { toast.error(e.message ?? "Failed"); }
  };
  const revokeAll = async () => {
    try { await securityApi.revokeAllOtherSessions(); toast.success("All other sessions revoked"); }
    catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security · Sessions"
        title="Active Sessions"
        description="Every browser signed into your account. Terminate anything you don't recognize."
        actions={
          others.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" /> Revoke all others
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revoke {others.length} other session{others.length === 1 ? "" : "s"}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will terminate every browser/device except this one. They will need to sign in again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={revokeAll} className="bg-destructive text-destructive-foreground">Revoke all</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        }
      />

      {sessionsQ.isLoading ? <Skeleton className="h-48 w-full" /> : sessions.length === 0 ? (
        <Card className="glass"><CardContent className="py-12 text-center text-muted-foreground">No sessions tracked yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {current && <SessionRow session={current} isCurrent />}
          {others.map(s => <SessionRow key={s.id} session={s} onRevoke={() => revoke(s.id)} />)}
        </div>
      )}
    </div>
  );
}

function SessionRow({ session, isCurrent, onRevoke }: { session: UserSession; isCurrent?: boolean; onRevoke?: () => void }) {
  const Icon = deviceIcon(session.device);
  const risk = computeRisk({
    mfaVerified: session.mfa_verified,
    ipKnown: !!session.ip_address,
    ageMs: Date.now() - new Date(session.created_at).getTime(),
  });
  const riskTone = risk >= 60 ? "destructive" : risk >= 30 ? "warning" : "success";
  const riskClass = riskTone === "destructive" ? "border-destructive/40 bg-destructive/10 text-destructive"
    : riskTone === "warning" ? "border-warning/40 bg-warning/10 text-warning"
    : "border-success/40 bg-success/10 text-success";

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`glass ${isCurrent ? "border-glow" : ""}`}>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2.5 ${isCurrent ? "bg-gradient-to-br from-primary/30 to-accent/30 text-primary glow" : "bg-muted/40 text-muted-foreground"}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{session.browser ?? "Browser"} · {session.os ?? "OS"}</span>
                {isCurrent && <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">CURRENT</Badge>}
                {session.mfa_verified
                  ? <Badge variant="outline" className="border-success/40 bg-success/10 text-success"><ShieldCheck className="mr-1 h-3 w-3" />MFA</Badge>
                  : <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning"><ShieldAlert className="mr-1 h-3 w-3" />NO MFA</Badge>}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{session.location ?? "unknown location"}</span>
                <span>{session.ip_address ?? "—"}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtRel(session.last_seen_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={riskClass}>RISK {risk}</Badge>
            {!isCurrent && onRevoke && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                    <LogOut className="mr-2 h-3.5 w-3.5" /> Revoke
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
                    <AlertDialogDescription>{session.browser} on {session.os} · {session.location ?? "unknown"}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onRevoke} className="bg-destructive text-destructive-foreground">
                      {<Loader2 className="hidden h-3.5 w-3.5 animate-spin" />}Revoke
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
