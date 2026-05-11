import { useUser } from "@clerk/react";

const ADMIN_EMAILS = [
  "nexus.admin@gmail.com",
  "fady.basem347@gmail.com",
];

export function useIsAdmin(): boolean {
  const { user } = useUser();
  if (!user) return false;
  const email = (user.primaryEmailAddress?.emailAddress ?? "").toLowerCase();
  return ADMIN_EMAILS.includes(email);
}
