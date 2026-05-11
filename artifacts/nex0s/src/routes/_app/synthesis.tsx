import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Activity, GitBranch, Database as DBIcon, Network } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { api, type Project } from "@/services/api";
import { FileTree, buildProjectTree } from "@/components/synthesis/FileTree";
import { BuildPipeline } from "@/components/synthesis/BuildPipeline";
import { AITerminal, type TerminalLine } from "@/components/synthesis/AITerminal";
import { FrontendArchitectureMap, BackendArchitectureMap } from "@/components/synthesis/ArchitectureMap";
import { SchemaViewer } from "@/components/synthesis/SchemaViewer";

const fmtTs = (iso: string) => new Date(iso).toLocaleTimeString([], { hour12: false });

function deriveTerminal(project: Project | undefined, aiMsgs: any[]): TerminalLine[] {
  if (!project) return [];
  const out: TerminalLine[] = [
    { ts: fmtTs(project.created_at), level: "sys", text: `init project[${project.id.slice(0, 8)}] stack=${project.stack ?? "auto"}` },
    { ts: fmtTs(project.created_at), level: "info", text: `language=${project.language} status=${project.status}` },
  ];
  aiMsgs.slice(-6).forEach(m => out.push({
    ts: fmtTs(m.created_at), level: "ai",
    text: `${m.role === "user" ? "user" : m.model ?? "ai"} :: ${m.content.slice(0, 110)}${m.content.length > 110 ? "…" : ""}`,
  }));
  out.sort((a, b) => a.ts.localeCompare(b.ts));
  return out;
}

export default function Synthesis() {
  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: api.listProjects, refetchInterval: 8000 });
  const projects = projectsQ.data ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(
    () => projects.find(p => p.id === activeId) ?? projects.find(p => p.status === "synthesizing") ?? projects[0],
    [projects, activeId]
  );
  const [selectedFile, setSelectedFile] = useState<string>();
  const [aiMsgs, setAiMsgs] = useState<any[]>([]);

  useEffect(() => {
    if (!active) return;
    api.listAIRequests(active.id).then(setAiMsgs).catch(() => {});
  }, [active?.id]);

  const tree = useMemo(() => buildProjectTree(active?.stack ?? null), [active?.stack]);
  const terminal = useMemo(() => deriveTerminal(active, aiMsgs), [active, aiMsgs]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 02 · Synthesis Engine"
        title="AI Software Factory"
        description="Watch NEX0S A1 autonomously synthesize the frontend, backend, schema, security and deployment in real time."
        actions={
          <Link to="/consultation">
            <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow">
              <Sparkles className="mr-2 h-4 w-4" /> New Project
            </Button>
          </Link>
        }
      />

      {projectsQ.isLoading ? <Skeleton className="h-96 w-full" /> : !active ? (
        <Card className="glass"><CardContent className="py-16 text-center text-muted-foreground">
          No projects yet. Start a consultation to begin synthesis.
        </CardContent></Card>
      ) : (
        <>
          <Card className="glass">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {projects.slice(0, 6).map(p => (
                  <button key={p.id} onClick={() => setActiveId(p.id)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-mono transition-colors ${
                      p.id === active.id
                        ? "border-primary/60 bg-primary/15 text-primary glow"
                        : "border-border/50 bg-card/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.name} <span className="ml-1 opacity-60">{p.synthesis_progress}%</span>
                  </button>
                ))}
              </div>
              <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
                <Activity className="mr-1 h-3 w-3" /> live · polling
              </Badge>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2"><BuildPipeline progress={active.synthesis_progress} status={active.status} /></div>
            <div className="lg:col-span-3"><AITerminal lines={terminal} streaming={active.status === "synthesizing"} /></div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="glass lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <GitBranch className="h-4 w-4 text-primary" /> Generated Project Tree
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[480px] overflow-auto">
                <FileTree node={tree} onSelect={setSelectedFile} selected={selectedFile} />
              </CardContent>
            </Card>

            <Card className="glass lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Network className="h-4 w-4 text-accent" /> System Architecture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="frontend" className="w-full">
                  <TabsList className="bg-background/40">
                    <TabsTrigger value="frontend">Frontend</TabsTrigger>
                    <TabsTrigger value="backend">Backend</TabsTrigger>
                    <TabsTrigger value="flow">Request Flow</TabsTrigger>
                  </TabsList>
                  <TabsContent value="frontend" className="mt-3"><FrontendArchitectureMap /></TabsContent>
                  <TabsContent value="backend" className="mt-3"><BackendArchitectureMap /></TabsContent>
                  <TabsContent value="flow" className="mt-3">
                    <div className="rounded-lg border border-border/40 bg-background/30 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                        {["Request", "Auth Middleware", "Controller", "Service", "Database", "Response"].map((s, i, arr) => (
                          <div key={s} className="flex items-center gap-2">
                            <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-primary">{s}</span>
                            {i < arr.length - 1 && <span className="text-accent">›</span>}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
                        <div>POST /api/projects → verify JWT → enforce RLS → projects.create() → INSERT projects → 201</div>
                        <div>POST /api/ai/stream → JWT → ai-gateway → SSE stream → INSERT ai_requests</div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <DBIcon className="h-4 w-4 text-success" /> Database Schema
              </CardTitle>
            </CardHeader>
            <CardContent><SchemaViewer /></CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
