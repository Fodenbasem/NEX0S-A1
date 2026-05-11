import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Cpu, ShieldCheck, Rocket, Sparkles, Hexagon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEX0S A1 — Autonomous AI Software Synthesis Platform" },
      {
        name: "description",
        content:
          "NEX0S A1 turns natural-language requirements into hardened, production-deployed full-stack applications — bilingual, secure-by-default, enterprise-ready.",
      },
      { property: "og:title", content: "NEX0S A1 — Autonomous AI Software Synthesis" },
      { property: "og:description", content: "From idea to deployed, OWASP-hardened SaaS in minutes." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Sparkles, title: "AI Consultation",  desc: "Bilingual (AR/EN) requirements interview that emits a precise technical blueprint." },
  { icon: Cpu,       title: "Full-Stack Synthesis", desc: "Frontend, backend, schema, auth and tests generated in parallel with live progress." },
  { icon: ShieldCheck, title: "Security Hardening", desc: "Simulated SAST, OWASP-aligned scoring and automatic patching of generated code." },
  { icon: Rocket,    title: "Autonomous Deploy", desc: "Containerize, migrate, warm and promote — straight to a live URL with rollback." },
  { icon: Brain,     title: "AI Brain Admin",   desc: "System telemetry, model routing, project analytics and cost controls in one console." },
  { icon: Hexagon,   title: "Enterprise Core",  desc: "JWT + MFA-ready auth, Helmet, rate limiting, input validation, sanitization, audit logs." },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Hexagon className="h-7 w-7 text-primary" strokeWidth={1.5} />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">N</div>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-[0.3em] text-foreground">NEX0S</div>
            <div className="text-[10px] font-mono text-muted-foreground">A1 · v1.0</div>
          </div>
        </div>
        <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#architecture" className="hover:text-foreground">Architecture</a>
          <a href="#security" className="hover:text-foreground">Security</a>
        </div>
        <Link to="/dashboard">
          <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 glow">
            Launch Console <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-24 text-center sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-primary"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-glow" />
          Autonomous Software Synthesis · Bilingual AR / EN
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl"
        >
          Describe it. <span className="text-gradient">We ship it.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg"
        >
          NEX0S A1 is an enterprise AI platform that consults, synthesizes, hardens and deploys
          full-stack applications — turning a conversation into a production URL in minutes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link to="/consultation">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow">
              Start an AI Consultation <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="outline" className="border-primary/40 bg-background/40 backdrop-blur">
              View Live Dashboard
            </Button>
          </Link>
        </motion.div>

        {/* Hero terminal */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="glass-strong rounded-xl p-1 shadow-[0_30px_120px_-20px] shadow-primary/30">
            <div className="rounded-lg bg-background/80 p-5 text-left font-mono text-xs sm:text-sm">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                <span className="ml-3 text-[10px] uppercase tracking-widest text-muted-foreground">nex0s · synthesis pipeline</span>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed text-foreground/90">
{`▸ consultation  ✔ blueprint generated         (gemini-2.0-pro · 3.2s)
▸ frontend      ✔ next.js + ts + tailwind     (47 files)
▸ backend       ✔ express + mongoose + jwt    (29 files)
▸ schema        ✔ 6 mongo models w/ indexes
▸ security      ✔ helmet · ratelimit · sanitize
▸ sast          ✔ 0 critical / 0 high
▸ deploy        ✔ live  →  `}<span className="text-primary">https://vertex-9921.nex0s.app</span>
              </pre>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-12 text-center">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Capabilities</div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A complete autonomous engineer</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass group rounded-xl p-5 transition hover:border-primary/40 hover:glow"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24 text-center">
        <div className="glass-strong rounded-2xl p-10 glow-violet">
          <h3 className="text-2xl font-bold sm:text-3xl">Ready to compress months into minutes?</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Open the console and run the full pipeline on a live demo project.
          </p>
          <Link to="/dashboard">
            <Button size="lg" className="mt-6 bg-gradient-to-r from-primary to-accent text-primary-foreground glow">
              Enter NEX0S Console <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/40 px-6 py-6 text-center text-xs font-mono text-muted-foreground">
        © NEX0S A1 · autonomous synthesis fabric
      </footer>
    </div>
  );
}
