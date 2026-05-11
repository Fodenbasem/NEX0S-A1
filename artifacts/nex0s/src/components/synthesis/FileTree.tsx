import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Folder, FolderOpen, FileCode, FileJson, FileText, Database, Shield, Cpu, Rocket, Settings } from "lucide-react";

export interface FileNode {
  name: string;
  type: "folder" | "file";
  ext?: string;
  children?: FileNode[];
}

const iconForFile = (name: string) => {
  if (name.endsWith(".json")) return FileJson;
  if (name.endsWith(".md")) return FileText;
  if (name.endsWith(".sql")) return Database;
  if (name.includes("security") || name.includes("auth")) return Shield;
  if (name.includes("ai")) return Cpu;
  if (name.includes("deploy")) return Rocket;
  if (name.includes("config") || name.endsWith(".toml") || name.endsWith(".env")) return Settings;
  return FileCode;
};

export function buildProjectTree(stack: string | null): FileNode {
  const isPostgres = (stack ?? "").toLowerCase().includes("postgres") || (stack ?? "").toLowerCase().includes("supabase");
  return {
    name: "project/", type: "folder", children: [
      { name: "frontend/", type: "folder", children: [
        { name: "app/", type: "folder", children: [
          { name: "layout.tsx", type: "file" },
          { name: "page.tsx", type: "file" },
          { name: "providers.tsx", type: "file" },
        ]},
        { name: "components/", type: "folder", children: [
          { name: "ui/", type: "folder", children: [
            { name: "button.tsx", type: "file" }, { name: "card.tsx", type: "file" }, { name: "dialog.tsx", type: "file" },
          ]},
          { name: "AppSidebar.tsx", type: "file" },
          { name: "PageHeader.tsx", type: "file" },
        ]},
        { name: "routes/", type: "folder", children: [
          { name: "dashboard.tsx", type: "file" }, { name: "consultation.tsx", type: "file" },
          { name: "synthesis.tsx", type: "file" }, { name: "security.tsx", type: "file" },
          { name: "deployment.tsx", type: "file" }, { name: "admin.tsx", type: "file" },
        ]},
        { name: "hooks/", type: "folder", children: [{ name: "use-mobile.tsx", type: "file" }] },
      ]},
      { name: "backend/", type: "folder", children: [
        { name: "middleware/", type: "folder", children: [
          { name: "auth-middleware.ts", type: "file" }, { name: "rate-limit.ts", type: "file" },
        ]},
        { name: "controllers/", type: "folder", children: [
          { name: "projects.controller.ts", type: "file" }, { name: "ai.controller.ts", type: "file" },
          { name: "security.controller.ts", type: "file" },
        ]},
        { name: "services/", type: "folder", children: [
          { name: "api.ts", type: "file" }, { name: "ai-gateway.ts", type: "file" },
        ]},
        { name: "models/", type: "folder", children: [
          { name: "project.model.ts", type: "file" }, { name: "user.model.ts", type: "file" },
        ]},
      ]},
      { name: "ai/", type: "folder", children: [
        { name: "consultation.edge.ts", type: "file" },
        { name: "synthesis.engine.ts", type: "file" },
        { name: "prompt-templates.ts", type: "file" },
      ]},
      { name: "database/", type: "folder", children: isPostgres ? [
        { name: "migrations/", type: "folder", children: [
          { name: "001_init.sql", type: "file" }, { name: "002_rls.sql", type: "file" },
        ]},
        { name: "schema.sql", type: "file" },
      ] : [{ name: "models.ts", type: "file" }] },
      { name: "deployment/", type: "folder", children: [
        { name: "Dockerfile", type: "file" }, { name: "wrangler.jsonc", type: "file" },
        { name: "edge.yaml", type: "file" },
      ]},
      { name: "config/", type: "folder", children: [
        { name: ".env.example", type: "file" }, { name: "tsconfig.json", type: "file" },
        { name: "vite.config.ts", type: "file" },
      ]},
      { name: "README.md", type: "file" },
      { name: "package.json", type: "file" },
    ],
  };
}

export function FileTree({ node, depth = 0, defaultOpen = true, onSelect, selected }: {
  node: FileNode; depth?: number; defaultOpen?: boolean;
  onSelect?: (path: string) => void; selected?: string;
}) {
  return <TreeNode node={node} depth={depth} path={node.name} defaultOpen={defaultOpen} onSelect={onSelect} selected={selected} />;
}

function TreeNode({ node, depth, path, defaultOpen, onSelect, selected }: {
  node: FileNode; depth: number; path: string; defaultOpen: boolean;
  onSelect?: (path: string) => void; selected?: string;
}) {
  const [open, setOpen] = useState(defaultOpen && depth < 2);
  const isFolder = node.type === "folder";
  const Icon = isFolder ? (open ? FolderOpen : Folder) : iconForFile(node.name);
  const active = selected === path;

  return (
    <div>
      <button
        onClick={() => { isFolder ? setOpen(o => !o) : onSelect?.(path); }}
        className={`group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs font-mono transition-colors ${
          active ? "bg-primary/15 text-primary" : "hover:bg-muted/40 text-foreground/85"
        }`}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        {isFolder ? (
          <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-90" : ""} text-muted-foreground`} />
        ) : <span className="w-3" />}
        <Icon className={`h-3.5 w-3.5 shrink-0 ${isFolder ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
        <span className="truncate">{node.name}</span>
      </button>
      <AnimatePresence initial={false}>
        {isFolder && open && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {node.children.map((c, i) => (
              <TreeNode key={c.name + i} node={c} depth={depth + 1} path={`${path}${c.name}`}
                defaultOpen={defaultOpen} onSelect={onSelect} selected={selected} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
