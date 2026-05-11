import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Hexagon, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · NEX0S A1" }] }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email" }).max(255),
  password: z.string().min(8, { message: "At least 8 characters" }).max(128),
});
const signupSchema = loginSchema.extend({
  displayName: z.string().trim().min(1, { message: "Required" }).max(100),
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await signIn(email, password);
        if (error) toast.error(error);
        else { toast.success("Welcome back"); navigate({ to: "/dashboard" }); }
      } else {
        const parsed = signupSchema.safeParse({ email, password, displayName });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await signUp(email, password, displayName);
        if (error) toast.error(error);
        else { toast.success("Account created"); navigate({ to: "/dashboard" }); }
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <Hexagon className="h-8 w-8 text-primary" strokeWidth={1.5} />
          <div>
            <div className="text-lg font-bold tracking-[0.3em]">NEX0S</div>
            <div className="text-[10px] font-mono text-muted-foreground">A1 · v1.0</div>
          </div>
        </Link>

        <Card className="glass-strong glow">
          <CardContent className="p-7">
            <div className="mb-5">
              <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create account"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "login" ? "Sign in to enter the AI Brain console." : "Spin up your synthesis workspace."}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs uppercase tracking-widest">Display name</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-9" placeholder="Khaled Awad" required />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs uppercase tracking-widest">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="pl-9" placeholder="you@nex0s.ai" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs uppercase tracking-widest">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pl-9" placeholder="••••••••" required minLength={8} />
                </div>
              </div>

              <Button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground glow">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight className="ml-1 h-4 w-4" /></>
                )}
              </Button>
            </form>

            <div className="mt-5 text-center text-xs text-muted-foreground">
              {mode === "login" ? "New to NEX0S?" : "Already have an account?"}{" "}
              <button onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="font-mono text-primary hover:underline">
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
