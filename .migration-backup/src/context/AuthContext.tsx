import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { securityApi } from "@/services/security-api";
import type { Session, User } from "@supabase/supabase-js";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener FIRST (per Supabase guidelines), then getSession.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      // Defer DB writes to avoid blocking auth callback (Supabase guideline).
      if (event === "SIGNED_IN" && s?.user) {
        setTimeout(() => {
          securityApi.upsertCurrentSession().catch(() => {});
          securityApi.log("auth.signed_in", { severity: "info", category: "auth" }).catch(() => {});
        }, 0);
      }
      if (event === "SIGNED_OUT") {
        // session row stays for history; not deleted
      }
      if (event === "PASSWORD_RECOVERY") {
        setTimeout(() => securityApi.log("auth.password_recovery", { severity: "high", category: "auth" }).catch(() => {}), 0);
      }
      if (event === "USER_UPDATED") {
        setTimeout(() => securityApi.log("auth.user_updated", { severity: "medium", category: "auth" }).catch(() => {}), 0);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) setTimeout(() => securityApi.upsertCurrentSession().catch(() => {}), 0);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Best-effort failed-login audit (no user id yet → fire after a brief delay if session arrives)
      return { error: error.message };
    }
    return {};
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: displayName },
      },
    });
    return error ? { error: error.message } : {};
  };

  const signOut = async () => {
    await securityApi.log("auth.signed_out", { severity: "info", category: "auth" }).catch(() => {});
    await supabase.auth.signOut();
  };

  return <Ctx.Provider value={{ user, session, loading, signIn, signUp, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
