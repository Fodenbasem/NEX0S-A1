import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { KeyRound, ShieldCheck, ShieldAlert, Loader2, Copy, Check, Trash2, RefreshCcw, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { securityApi } from "@/services/security-api";

export const Route = createFileRoute("/_app/mfa")({
  head: () => ({ meta: [{ title: "MFA / TOTP · NEX0S A1" }] }),
  component: MFAPage,
});

function MFAPage() {
  const qc = useQueryClient();
  const factorsQ = useQuery({ queryKey: ["mfa-factors"], queryFn: securityApi.mfaListFactors });
  const codesCountQ = useQuery({ queryKey: ["mfa-backup-count"], queryFn: securityApi.countRemainingBackupCodes });

  const allFactors = (factorsQ.data?.all ?? []).filter(f => f.factor_type === "totp");
  const verified = allFactors.filter(f => f.status === "verified");
  const unverified = allFactors.filter(f => f.status === "unverified");
  const isEnrolled = verified.length > 0;

  // Enrollment state
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<string[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const startEnroll = async () => {
    setBusy(true);
    try {
      // clean up any half-finished factor first
      for (const f of unverified) await securityApi.mfaUnenroll(f.id).catch(() => {});
      const e = await securityApi.mfaEnrollStart();
      setEnroll(e);
    } catch (e: any) { toast.error(e.message ?? "Failed to start enrollment"); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    if (!enroll || code.length !== 6) return;
    setBusy(true);
    try {
      await securityApi.mfaEnrollVerify(enroll.factorId, code);
      toast.success("MFA enabled");
      const codes = await securityApi.generateAndStoreBackupCodes();
      setGenerated(codes);
      setEnroll(null); setCode("");
      qc.invalidateQueries({ queryKey: ["mfa-factors"] });
      qc.invalidateQueries({ queryKey: ["mfa-backup-count"] });
    } catch (e: any) { toast.error(e.message ?? "Invalid code"); }
    finally { setBusy(false); }
  };

  const regenerateCodes = async () => {
    setBusy(true);
    try {
      const codes = await securityApi.generateAndStoreBackupCodes();
      setGenerated(codes);
      qc.invalidateQueries({ queryKey: ["mfa-backup-count"] });
      toast.success("New backup codes generated");
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setBusy(false); }
  };

  const disableMFA = async () => {
    setBusy(true);
    try {
      for (const f of [...verified, ...unverified]) await securityApi.mfaUnenroll(f.id);
      toast.success("MFA disabled");
      setEnroll(null); setGenerated(null);
      qc.invalidateQueries({ queryKey: ["mfa-factors"] });
      qc.invalidateQueries({ queryKey: ["mfa-backup-count"] });
    } catch (e: any) { toast.error(e.message ?? "Failed to disable"); } finally { setBusy(false); }
  };

  useEffect(() => () => setEnroll(null), []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security · MFA"
        title="Multi-Factor Authentication"
        description="Bind a TOTP authenticator (1Password, Authy, Google Authenticator) to your account and generate single-use recovery codes."
      />

      {factorsQ.isLoading ? <Skeleton className="h-48 w-full" /> : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Status card */}
          <Card className="glass lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                {isEnrolled ? <ShieldCheck className="h-4 w-4 text-success" /> : <ShieldAlert className="h-4 w-4 text-warning" />}
                MFA Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">TOTP</span>
                <Badge variant="outline" className={isEnrolled ? "border-success/40 bg-success/10 text-success" : "border-warning/40 bg-warning/10 text-warning"}>
                  {isEnrolled ? "ENABLED" : "DISABLED"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Recovery codes</span>
                <span className="font-mono text-xs">{codesCountQ.data ?? 0} unused</span>
              </div>
              <div className="rounded-md border border-border/40 bg-background/40 p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {isEnrolled
                  ? "Account hardened · phishing-resistant TOTP active"
                  : "Vulnerable to credential theft · enroll TOTP to harden"}
              </div>
              {isEnrolled && (
                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={regenerateCodes} disabled={busy}>
                    <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Regenerate codes
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Disable MFA
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disable Multi-Factor Authentication?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Removes your TOTP factor and invalidates all backup codes. Your account will be protected by password only.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={disableMFA} className="bg-destructive text-destructive-foreground">Disable</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enrollment / verified card */}
          <Card className="glass lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <KeyRound className="h-4 w-4 text-primary" />
                {isEnrolled && !enroll ? "Authenticator bound" : "Bind authenticator"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEnrolled && !enroll && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Your account is protected by a TOTP authenticator. Use it on every sign-in and keep your recovery codes safe.</p>
                  <ul className="ml-4 list-disc space-y-1 text-xs">
                    {verified.map(f => (
                      <li key={f.id} className="font-mono">{f.friendly_name ?? "TOTP"} · created {new Date(f.created_at).toLocaleDateString()}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!isEnrolled && !enroll && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Generate a one-time secret, scan the QR with your authenticator app, then verify a 6-digit code to activate MFA.
                  </p>
                  <Button onClick={startEnroll} disabled={busy} className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow">
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                    Begin enrollment
                  </Button>
                </div>
              )}

              {enroll && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="grid gap-5 md:grid-cols-2"
                >
                  <div className="space-y-2">
                    <div className="rounded-lg border border-primary/30 bg-background/60 p-3 glow">
                      <img src={enroll.qr} alt="MFA QR Code" className="h-48 w-48 mx-auto rounded bg-white p-2" />
                    </div>
                    <div className="rounded-md border border-border/50 bg-background/40 p-2">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Manual key</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <code className="break-all font-mono text-[11px]">{enroll.secret}</code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(enroll.secret); setCopied("secret"); toast.success("Copied"); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copied === "secret" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Step 02 — Verify code</div>
                    <Input
                      inputMode="numeric" maxLength={6} value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="text-center font-mono text-2xl tracking-[0.6em]"
                    />
                    <Button onClick={verify} disabled={busy || code.length !== 6} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                      Verify & enable
                    </Button>
                    <Button variant="ghost" onClick={() => { setEnroll(null); setCode(""); }} className="w-full">Cancel</Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Backup codes panel */}
          {generated && (
            <Card className="glass scanline lg:col-span-3 border-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-warning">
                  <ShieldAlert className="h-4 w-4" /> Recovery codes — shown only once
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">Store these somewhere safe. Each code can be used once if you lose access to your authenticator.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {generated.map((c, i) => (
                    <div key={i} className="rounded-md border border-primary/30 bg-background/60 px-3 py-2 text-center font-mono text-sm tracking-wider">
                      {c}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(generated.join("\n")); toast.success("Copied"); }}>
                    <Copy className="mr-2 h-3.5 w-3.5" /> Copy all
                  </Button>
                  <Button size="sm" onClick={() => setGenerated(null)}>I've saved them</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
