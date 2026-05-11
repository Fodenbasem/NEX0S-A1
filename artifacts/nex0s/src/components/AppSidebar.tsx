import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Sparkles, Cpu, ShieldCheck, Rocket, Brain, Hexagon,
  KeyRound, Monitor, ScrollText, LogOut, User, Lock,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@clerk/react";

const workspace = [
  { title: "Dashboard",    url: "/dashboard",    icon: LayoutDashboard },
  { title: "Consultation", url: "/consultation", icon: Sparkles },
  { title: "Synthesis",    url: "/synthesis",    icon: Cpu },
  { title: "Security",     url: "/security",     icon: ShieldCheck },
  { title: "Deployment",   url: "/deployment",   icon: Rocket },
  { title: "AI Brain",     url: "/admin",        icon: Brain },
];

const security = [
  { title: "MFA / TOTP",   url: "/mfa",      icon: KeyRound },
  { title: "Sessions",     url: "/sessions", icon: Monitor },
  { title: "Audit Log",    url: "/audit",    icon: ScrollText },
];

const adminLinks = [
  { title: "Nexus Control", url: "/admin/nexus-control", icon: Lock },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [path] = useLocation();
  const { signOut } = useAuth();
  const { user } = useUser();

  const renderItem = (item: { title: string; url: string; icon: any }) => {
    const active = path === item.url;
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={active}>
          <Link
            to={item.url}
            className={active ? "bg-sidebar-accent text-primary border-l-2 border-primary" : "hover:bg-sidebar-accent/60"}
          >
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-3">
          <div className="relative">
            <Hexagon className="h-7 w-7 text-primary" strokeWidth={1.5} />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">N</div>
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-widest text-foreground">NEX0S-A1</div>
              <div className="text-[10px] font-mono text-muted-foreground">AI Synthesis · v2.0</div>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{workspace.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Security</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{security.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{adminLinks.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-2 space-y-2">
            {user && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{user.primaryEmailAddress?.emailAddress ?? user.fullName ?? "User"}</span>
              </div>
            )}
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
            <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success pulse-glow" />
              <span>NEX0S-A1 NOMINAL</span>
            </div>
            <div className="font-mono text-[10px] opacity-70 text-muted-foreground">uptime 99.998%</div>
          </div>
        )}
        {collapsed && (
          <button
            onClick={() => signOut()}
            className="flex w-full items-center justify-center p-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
