import { useUser } from "@clerk/react";

const ADMIN_EMAIL = "admin@nexus.a1";

export function useIsAdmin(): boolean {
  const { user } = useUser();
  if (!user) return false;
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
