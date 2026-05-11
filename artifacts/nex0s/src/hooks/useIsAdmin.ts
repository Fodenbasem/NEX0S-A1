import { useUser } from "@clerk/react";

const MASTER_ADMIN_EMAIL = "nexus.admin@gmail.com";

export function useIsAdmin(): boolean {
  const { user } = useUser();
  if (!user) return false;
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  return email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
}
