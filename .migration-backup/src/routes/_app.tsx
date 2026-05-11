import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Search, Bell, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const initials = (user.user_metadata?.display_name || user.email || "U")
    .split(/\s+|@/)[0].slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full">
        <div className="pointer-events-none fixed inset-0 grid-bg opacity-40" />
        <AppSidebar />

        <div className="relative flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/50 glass-strong px-4">
            <SidebarTrigger />
            <div className="hidden flex-1 items-center gap-2 sm:flex">
              <div className="flex w-full max-w-md items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-1.5">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  placeholder="Search projects, scans, deployments…"
                />
                <kbd className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link to="/" className="hidden text-xs font-mono text-muted-foreground hover:text-foreground sm:block">← landing</Link>
              <button className="rounded-md p-2 hover:bg-muted/50">
                <Bell className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card/40 px-2 py-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[10px] font-bold text-primary-foreground">
                  {initials}
                </div>
                <span className="hidden text-xs sm:inline">{user.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate({ to: "/" }))}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="relative flex-1 px-4 py-6 sm:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
