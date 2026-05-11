import { createContext, useContext, type ReactNode } from "react";
import { useUser, useClerk } from "@clerk/react";

interface AuthCtx {
  user: { id: string; email?: string; displayName?: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const mappedUser = user ? {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress,
    displayName: user.fullName ?? user.firstName ?? user.primaryEmailAddress?.emailAddress ?? "User",
  } : null;

  const signOut = async () => {
    await clerkSignOut();
  };

  return (
    <Ctx.Provider value={{ user: mappedUser, loading: !isLoaded, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
