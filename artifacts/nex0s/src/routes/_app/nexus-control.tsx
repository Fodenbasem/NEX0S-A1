import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, Plus, Trash2, Search, ShieldCheck, Loader2, Users, ShieldX } from "lucide-react";
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
          Nexus Control is restricted to the master admin account. Contact your system administrator.
        </p>
      </div>
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 font-mono text-[11px] text-left space-y-1">
        <div><span className="text-destructive">✗</span> route: <span className="text-foreground">/admin/nexus-control</span></div>
        <div><span className="text-destructive">✗</span> access: <span className="text-destructive">DENIED</span></div>
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
      setNewEmail("");
      setNewNote("");
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
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    addMutation.mutate();
  };

  const entries = listQ.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Nexus Control"
        title="Whitelist Management"
        description="Control access to NEX0S-A1. Only whitelisted users can enter the AI synthesis console after authentication."
        actions={
          <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
            <Shield className="mr-1.5 h-3 w-3" /> Master Admin Only
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Whitelisted Users", value: entries.length, icon: ShieldCheck, color: "text-success" },
          { label: "MongoDB Status", value: listQ.isError ? "Disconnected" : "Active", icon: Shield, color: listQ.isError ? "text-destructive" : "text-primary" },
          { label: "Access Gate", value: "Enforced", icon: ShieldX, color: "text-accent" },
        ].map((s) => (
          <Card key={s.label} className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} /> {s.label}
              </div>
              <div className="mt-1 text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-primary" /> Add Whitelisted User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@domain.com"
              className="flex-1 min-w-[200px]"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Note (optional)"
              className="flex-1 min-w-[160px]"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button
              onClick={handleAdd}
              disabled={addMutation.isPending}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow"
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1.5 h-4 w-4" /> Add</>}
            </Button>
          </div>
        </CardContent>
      </Card>

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
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {listQ.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : listQ.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
              MongoDB Atlas not connected — whitelist unavailable. Whitelist 0.0.0.0/0 in Atlas Network Access.
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
              {search ? "No users match the search." : "No whitelisted users yet. Add one above."}
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map((entry: any, i: number) => (
                <motion.div
                  key={entry._id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5 transition hover:border-primary/30"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-sm">{entry.email}</div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      {entry.note && <span className="truncate">{entry.note}</span>}
                      <span className="font-mono">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDelete({ id: entry._id, email: entry.email })}
                  >
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
              <span className="font-medium text-foreground">{pendingDelete?.email}</span> will lose access to NEX0S-A1 immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && removeMutation.mutate(pendingDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
