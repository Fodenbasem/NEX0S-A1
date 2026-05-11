import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Shield, Plus, Trash2, Search, ShieldCheck, Loader2, Users, ShieldX,
  CheckCircle2, XCircle, RefreshCw, Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center">
        <ShieldX className="h-8 w-8 text-destructive" />
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-destructive mb-2">403 Forbidden</div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Access Required</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Nexus Control is restricted to master admin accounts only.
        </p>
      </div>
    </div>
  );
}

export default function NexusControl() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; email: string } | null>(null);

  const dbStatus = useQuery({
    queryKey: ["db-status"],
    queryFn: () => api.getMongoStatus(),
    enabled: isAdmin,
    refetchInterval: 10_000,
    retry: false,
  });

  const listQ = useQuery({
    queryKey: ["whitelist", search],
    queryFn: () => api.listWhitelist(search || undefined),
    enabled: isAdmin,
    refetchInterval: 15_000,
  });

  const addMutation = useMutation({
    mutationFn: () => api.addToWhitelist(newEmail.trim(), newNote.trim() || undefined),
    onSuccess: () => {
      toast.success(`${newEmail} whitelisted`);
      setNewEmail(""); setNewNote("");
      qc.invalidateQueries({ queryKey: ["whitelist"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.removeFromWhitelist(id),
    onSuccess: () => {
      toast.success("User removed from whitelist");
      qc.invalidateQueries({ queryKey: ["whitelist"] });
      setPendingDelete(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isAdmin) return <AccessDenied />;

  const handleAdd = () => {
    if (!newEmail.trim() || !newEmail.includes("@")) { toast.error("Enter a valid email"); return; }
    addMutation.mutate();
  };

  const connected = dbStatus.data?.connected ?? false;
  const dbLabel = dbStatus.data?.label ?? "checking…";
  const entries = listQ.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Nexus Control"
        title="Whitelist Management"
        description="Control who can access the NEX0S-A1 AI synthesis console after Clerk authentication."
        actions={
          <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
            <Shield className="mr-1.5 h-3 w-3" /> Master Admin Only
          </Badge>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${connected ? "bg-success/10 border border-success/30" : "bg-destructive/10 border border-destructive/30"}`}>
              {dbStatus.isLoading
                ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                : connected
                  ? <CheckCircle2 className="h-5 w-5 text-success" />
                  : <XCircle className="h-5 w-5 text-destructive" />}
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">PostgreSQL</div>
              <div className={`font-bold capitalize ${connected ? "text-success" : "text-destructive"}`}>
                {dbStatus.isLoading ? "Checking…" : dbLabel}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Whitelisted Users</div>
              <div className="text-2xl font-bold">{entries.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Access Gate</div>
              <div className="font-bold text-accent">Enforced</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DB offline banner */}
      {!dbStatus.isLoading && !connected && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <span className="font-medium text-destructive">Database not reachable.</span>
            <span className="ml-1 text-muted-foreground">Check that DATABASE_URL is set and the PostgreSQL instance is running.</span>
          </div>
          <Button
            variant="ghost" size="sm"
            className="h-7 shrink-0 text-xs"
            onClick={() => qc.invalidateQueries({ queryKey: ["db-status"] })}
          >
            <RefreshCw className="mr-1 h-3 w-3" /> Retry
          </Button>
        </div>
      )}

      {/* Add user */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-primary" /> Add Whitelisted User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@domain.com" className="flex-1 min-w-[200px]"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
            <Input value={newNote} onChange={(e) => setNewNote(e.target.value)}
              placeholder="Note (optional)" className="flex-1 min-w-[160px]"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
            <Button onClick={handleAdd} disabled={addMutation.isPending}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1.5 h-4 w-4" /> Add</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User list */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> Whitelisted Users</span>
            <span className="font-mono text-xs text-muted-foreground">{entries.length} entries</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>

          {listQ.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
              {search ? "No users match the search." : "No whitelisted users yet. Add one above."}
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map((entry: any, i: number) => (
                <motion.div key={entry.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5 transition hover:border-primary/30">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-sm">{entry.email}</div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      {entry.note && <span className="truncate italic">{entry.note}</span>}
                      <span className="font-mono">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm"
                    className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDelete({ id: entry.id, email: entry.email })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from whitelist?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{pendingDelete?.email}</span> will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && removeMutation.mutate(pendingDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
