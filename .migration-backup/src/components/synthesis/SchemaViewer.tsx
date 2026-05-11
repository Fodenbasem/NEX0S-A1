import { useState } from "react";
import { motion } from "framer-motion";
import { Database, Key, Link2, Search } from "lucide-react";

interface Field { name: string; type: string; pk?: boolean; fk?: string; nullable?: boolean; }
interface Table { name: string; fields: Field[]; rls: boolean; }

const TABLES: Table[] = [
  { name: "profiles", rls: true, fields: [
    { name: "id", type: "uuid", pk: true }, { name: "email", type: "text" },
    { name: "display_name", type: "text", nullable: true }, { name: "avatar_url", type: "text", nullable: true },
    { name: "created_at", type: "timestamptz" }, { name: "updated_at", type: "timestamptz" },
  ]},
  { name: "projects", rls: true, fields: [
    { name: "id", type: "uuid", pk: true }, { name: "owner_id", type: "uuid", fk: "profiles.id" },
    { name: "name", type: "text" }, { name: "description", type: "text", nullable: true },
    { name: "status", type: "project_status" }, { name: "stack", type: "text", nullable: true },
    { name: "blueprint", type: "jsonb", nullable: true }, { name: "synthesis_progress", type: "int4" },
    { name: "created_at", type: "timestamptz" },
  ]},
  { name: "ai_requests", rls: true, fields: [
    { name: "id", type: "uuid", pk: true }, { name: "project_id", type: "uuid", fk: "projects.id" },
    { name: "user_id", type: "uuid", fk: "profiles.id" }, { name: "role", type: "ai_role" },
    { name: "content", type: "text" }, { name: "model", type: "text", nullable: true },
    { name: "latency_ms", type: "int4", nullable: true },
  ]},
  { name: "security_reports", rls: true, fields: [
    { name: "id", type: "uuid", pk: true }, { name: "project_id", type: "uuid", fk: "projects.id" },
    { name: "user_id", type: "uuid", fk: "profiles.id" }, { name: "composite_score", type: "int4" },
    { name: "owasp_scores", type: "jsonb" }, { name: "findings", type: "jsonb" },
  ]},
  { name: "deployments", rls: true, fields: [
    { name: "id", type: "uuid", pk: true }, { name: "project_id", type: "uuid", fk: "projects.id" },
    { name: "user_id", type: "uuid", fk: "profiles.id" }, { name: "status", type: "deployment_status" },
    { name: "live_url", type: "text", nullable: true }, { name: "duration_ms", type: "int4", nullable: true },
  ]},
  { name: "user_roles", rls: true, fields: [
    { name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: "profiles.id" },
    { name: "role", type: "app_role" },
  ]},
  { name: "activity_logs", rls: true, fields: [
    { name: "id", type: "uuid", pk: true }, { name: "project_id", type: "uuid", fk: "projects.id", nullable: true },
    { name: "user_id", type: "uuid", fk: "profiles.id" }, { name: "action", type: "text" },
    { name: "metadata", type: "jsonb", nullable: true },
  ]},
];

export function SchemaViewer() {
  const [q, setQ] = useState("");
  const filtered = TABLES.filter(t =>
    t.name.includes(q.toLowerCase()) || t.fields.some(f => f.name.includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background/40 px-3 py-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search tables, fields…"
          className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
        />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{filtered.length} tbl</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="glass rounded-lg p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-xs font-semibold text-foreground">{t.name}</span>
              </div>
              {t.rls && (
                <span className="rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-success">RLS</span>
              )}
            </div>
            <ul className="divide-y divide-border/30">
              {t.fields.map(f => (
                <li key={f.name} className="flex items-center justify-between gap-2 py-1 text-[11px]">
                  <span className="flex items-center gap-1.5 truncate font-mono">
                    {f.pk && <Key className="h-2.5 w-2.5 text-warning" />}
                    {f.fk && <Link2 className="h-2.5 w-2.5 text-accent" />}
                    <span className="truncate">{f.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {f.type}{f.nullable ? "?" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
