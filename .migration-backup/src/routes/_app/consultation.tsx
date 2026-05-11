import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Languages, Bot, User, Loader2, Plus, MoreVertical, Copy, Trash2, FileJson, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/PageHeader";
import { api, type AIRequest, type Project } from "@/services/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/consultation")({
  head: () => ({ meta: [{ title: "AI Consultation · NEX0S A1" }] }),
  component: Consultation,
});

// ---------- Blueprint export helpers ----------
function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function blueprintToMarkdown(p: Project, msgs: AIRequest[]): string {
  const lines: string[] = [];
  lines.push(`# ${p.name}`, "");
  if (p.description) lines.push(`> ${p.description}`, "");
  lines.push(`- **Status:** \`${p.status}\``);
  lines.push(`- **Stack:** ${p.stack ?? "—"}`);
  lines.push(`- **Language:** ${p.language}`);
  lines.push(`- **Created:** ${new Date(p.created_at).toISOString()}`);
  lines.push("", "## AI Consultation Transcript", "");
  for (const m of msgs) {
    const who = m.role === "ai" ? "🤖 NEX0S" : m.role === "user" ? "👤 You" : "⚙️ System";
    lines.push(`### ${who}${m.model ? ` _(${m.model})_` : ""}`, "", m.content, "");
  }
  if (p.blueprint) {
    lines.push("## Blueprint (structured)", "", "```json", JSON.stringify(p.blueprint, null, 2), "```");
  }
  return lines.join("\n");
}

function Consultation() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Project | null>(null);
  const [messages, setMessages] = useState<AIRequest[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listProjects().then((p) => {
      setProjects(p);
      if (p[0]) setActive(p[0]);
    }).catch((e) => toast.error(e.message));
  }, []);

  useEffect(() => {
    if (!active) { setMessages([]); return; }
    api.listAIRequests(active.id).then(setMessages).catch((e) => toast.error(e.message));
  }, [active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const createProject = async () => {
    if (!newName.trim()) { toast.error("Project name required"); return; }
    setCreating(true);
    try {
      const p = await api.createProject({ name: newName.trim() });
      setProjects((prev) => [p, ...prev]);
      setActive(p);
      setNewName("");
      toast.success("Project created");
    } catch (e: any) { toast.error(e.message); }
    finally { setCreating(false); }
  };

  // Live streaming buffer (separate from persisted messages)
  const [streamBuffer, setStreamBuffer] = useState("");

  const send = async () => {
    if (!input.trim() || !active || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    setStreamBuffer("");

    // Optimistic user bubble
    const optimistic: AIRequest = {
      id: `tmp-${Date.now()}`, project_id: active.id, user_id: "", role: "user",
      content: text, model: null, tokens_in: null, tokens_out: null, latency_ms: null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    try {
      await api.streamConsultation(active.id, text, (delta) => {
        setStreamBuffer((b) => b + delta);
        // auto-scroll while streaming
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
      const fresh = await api.listAIRequests(active.id);
      setMessages(fresh);
      setStreamBuffer("");
    } catch (e: any) {
      toast.error(e.message || "AI request failed");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setStreamBuffer("");
    } finally { setSending(false); }
  };

  // ---- Project actions ----
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const exportJson = async (p: Project) => {
    try {
      const bp = await api.exportBlueprint(p.id);
      downloadBlob(`${p.name.replace(/\s+/g, "-").toLowerCase()}.blueprint.json`,
        "application/json", JSON.stringify(bp, null, 2));
      toast.success("Exported JSON");
    } catch (e: any) { toast.error(e.message); }
  };

  const exportMd = async (p: Project) => {
    try {
      const bp = await api.exportBlueprint(p.id);
      downloadBlob(`${p.name.replace(/\s+/g, "-").toLowerCase()}.blueprint.md`,
        "text/markdown", blueprintToMarkdown(bp.project, bp.messages));
      toast.success("Exported Markdown");
    } catch (e: any) { toast.error(e.message); }
  };

  const duplicate = async (p: Project) => {
    try {
      const copy = await api.duplicateProject(p.id);
      setProjects((prev) => [copy, ...prev]);
      setActive(copy);
      toast.success("Project duplicated");
    } catch (e: any) { toast.error(e.message); }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await api.deleteProject(pendingDelete.id);
      setProjects((prev) => prev.filter((x) => x.id !== pendingDelete.id));
      if (active?.id === pendingDelete.id) setActive(null);
      toast.success("Project deleted");
    } catch (e: any) { toast.error(e.message); }
    finally { setPendingDelete(null); }
  };


  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 01 · Consultation"
        title="Conversational AI Architect"
        description="Bilingual requirements interview powered by Lovable AI Gateway (Gemini · GPT fallback). Output: a structured technical blueprint."
        actions={
          <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
            <Languages className="mr-1.5 h-3 w-3" /> AR · EN
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Project list */}
        <Card className="glass">
          <CardContent className="space-y-3 p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Projects</div>
            <div className="flex gap-1">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="New project…" className="h-8 text-xs"
                onKeyDown={(e) => e.key === "Enter" && createProject()} />
              <Button size="sm" onClick={createProject} disabled={creating}
                className="h-8 bg-gradient-to-r from-primary to-accent">
                {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </Button>
            </div>
            <div className="space-y-1">
              {projects.length === 0 && (
                <div className="rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
                  Create your first project to start a consultation.
                </div>
              )}
              {projects.map((p) => (
                <div key={p.id}
                  className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs transition ${
                    active?.id === p.id
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/40 bg-card/40 hover:border-primary/30"
                  }`}>
                  <button onClick={() => setActive(p)} className="flex-1 truncate text-left">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{p.status}</div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-muted/50 hover:text-foreground group-hover:opacity-100"
                        aria-label="Project actions">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel className="text-xs">{p.name}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => exportJson(p)}>
                        <FileJson className="mr-2 h-3.5 w-3.5" /> Export JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportMd(p)}>
                        <FileText className="mr-2 h-3.5 w-3.5" /> Export Markdown
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicate(p)}>
                        <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setPendingDelete(p)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat */}
        <Card className="glass flex h-[640px] flex-col">
          <CardContent ref={scrollRef as any} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            {!active ? (
              <div className="m-auto text-center text-sm text-muted-foreground">
                Select or create a project to begin.
              </div>
            ) : messages.length === 0 ? (
              <div className="m-auto max-w-md text-center">
                <Sparkles className="mx-auto mb-3 h-6 w-6 text-primary" />
                <div className="text-sm text-muted-foreground">
                  Describe what you want to build. NEX0S will ask focused questions and produce a production-ready blueprint.
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <motion.div key={m.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    m.role === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                  }`}>
                    {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "border border-primary/20 bg-card/60"
                  }`}>
                    {m.content}
                    {m.model && (
                      <div className="mt-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        {m.model} · {m.latency_ms}ms
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
            {sending && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                  {streamBuffer
                    ? <Bot className="h-4 w-4 text-primary-foreground" />
                    : <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />}
                </div>
                <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl border border-primary/20 bg-card/60 px-4 py-2.5 text-sm">
                  {streamBuffer || <span className="text-muted-foreground">Streaming…</span>}
                  {streamBuffer && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />}
                </div>
              </motion.div>
            )}
          </CardContent>
          <div className="border-t border-border/50 p-3">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={active ? "Describe your application — in English or Arabic…" : "Select a project first…"}
                disabled={!active || sending}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50" />
              <Button size="sm" onClick={send} disabled={!active || sending || !input.trim()}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <span className="font-medium text-foreground">{pendingDelete?.name}</span> and
              its conversation, scans, and deployments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
