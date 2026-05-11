import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

export interface TerminalLine {
  ts: string;
  level: "info" | "ok" | "warn" | "ai" | "sys";
  text: string;
}

const tone: Record<TerminalLine["level"], string> = {
  info: "text-foreground/80",
  ok: "text-success",
  warn: "text-warning",
  ai: "text-primary",
  sys: "text-accent",
};

export function AITerminal({ lines, streaming }: { lines: TerminalLine[]; streaming?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [lines.length]);

  return (
    <div className="glass scanline overflow-hidden rounded-xl border-glow">
      <div className="flex items-center justify-between border-b border-border/40 bg-background/40 px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">nex0s://ai-terminal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-destructive/70" />
          <span className="h-2 w-2 rounded-full bg-warning/70" />
          <span className="h-2 w-2 rounded-full bg-success/70" />
        </div>
      </div>
      <div ref={ref} className="max-h-80 min-h-64 overflow-auto bg-background/30 p-4 font-mono text-[11.5px] leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-3">
            <span className="shrink-0 text-muted-foreground/60">{l.ts}</span>
            <span className={`shrink-0 ${tone[l.level]}`}>{l.level === "ai" ? "AI›" : l.level === "ok" ? " ✔ " : l.level === "warn" ? " ! " : l.level === "sys" ? "SYS" : "···"}</span>
            <span className={tone[l.level]}>{l.text}</span>
          </div>
        ))}
        {streaming && (
          <div className="mt-1 flex items-center gap-2 text-primary">
            <span className="font-mono">$</span>
            <span className="inline-block h-3 w-2 animate-pulse bg-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
