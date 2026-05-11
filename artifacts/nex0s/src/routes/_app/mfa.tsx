import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";

export default function MFAPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security · MFA"
        title="Multi-Factor Authentication"
        description="TOTP-based MFA will be available in a future update. Your account is currently protected by email + password."
      />
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldAlert className="h-4 w-4 text-warning" />
            MFA Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">TOTP Authenticator</span>
            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
              COMING SOON
            </Badge>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-primary/20 bg-primary/5 p-4"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <div className="font-medium text-foreground">Account Security</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Your account is protected by Clerk's secure authentication system. TOTP multi-factor authentication
                  will be available in a future release. For now, use a strong, unique password to keep your account safe.
                </div>
              </div>
            </div>
          </motion.div>
          <div className="rounded-md border border-border/40 bg-background/40 p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            mfa.totp · status: pending · eta: upcoming release
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
