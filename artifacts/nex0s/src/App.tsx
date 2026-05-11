import { useEffect, useRef, useState, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser, Show, RedirectToSignIn } from "@clerk/react";
import { dark } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider } from "@/context/AuthContext";
import { securityApi } from "@/services/security-api";
import { api } from "@/services/api";
import NotFound from "@/pages/not-found";
import { Loader2, ShieldX, Hexagon } from "lucide-react";

import Dashboard from "@/routes/_app/dashboard";
import Consultation from "@/routes/_app/consultation";
import Synthesis from "@/routes/_app/synthesis";
import Security from "@/routes/_app/security";
import Deployment from "@/routes/_app/deployment";
import Admin from "@/routes/_app/admin";
import MFA from "@/routes/_app/mfa";
import Sessions from "@/routes/_app/sessions";
import Audit from "@/routes/_app/audit";
import NexusControl from "@/routes/_app/nexus-control";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;
const basePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk" as const,
  variables: {
    colorPrimary: "oklch(0.78 0.18 200)",
    colorForeground: "oklch(0.93 0.02 260)",
    colorMutedForeground: "oklch(0.65 0.05 260)",
    colorDanger: "oklch(0.64 0.25 25)",
    colorBackground: "oklch(0.17 0.04 268)",
    colorInput: "oklch(0.25 0.05 268)",
    colorInputForeground: "oklch(0.93 0.02 260)",
    colorNeutral: "oklch(0.35 0.06 268)",
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden border border-white/10",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-bold tracking-tight",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground",
    formFieldLabel: "text-foreground",
    footerActionLink: "text-primary hover:text-primary/80",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-success",
    alertText: "text-foreground",
    socialButtonsBlockButton: "border border-white/10 bg-white/5 hover:bg-white/10",
    formButtonPrimary: "bg-gradient-to-r from-primary to-accent text-primary-foreground",
    formFieldInput: "border-white/20 bg-white/5 text-foreground",
    footerAction: "border-t border-white/10",
    dividerLine: "bg-white/10",
    alert: "border border-destructive/30 bg-destructive/10",
    otpCodeFieldInput: "border-white/20 bg-white/5 text-foreground",
  },
};

const clerkLocalization = {
  signIn: {
    start: {
      title: "NEX0S-A1 · Sign In",
      subtitle: "Access the AI synthesis console",
    },
  },
  signUp: {
    start: {
      title: "NEX0S-A1 · Get Started",
      subtitle: "Create your synthesis workspace",
    },
  },
};

function AuthBrand() {
  return (
    <div className="text-center space-y-1 mb-6">
      <div className="flex items-center justify-center gap-2">
        <Hexagon className="h-7 w-7 text-primary" strokeWidth={1.5} />
        <div className="text-2xl font-bold tracking-widest text-foreground">NEX0S</div>
        <div className="font-mono text-xs text-muted-foreground border border-primary/30 rounded px-1.5 py-0.5 bg-primary/5">A1</div>
      </div>
      <div className="text-sm text-muted-foreground font-mono">AI Synthesis Platform · v2.0</div>
    </div>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% -20%, oklch(0.78 0.18 200 / 0.15), transparent)" }} />
      <div className="relative z-10 w-full max-w-md space-y-4">
        <AuthBrand />
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% -20%, oklch(0.78 0.18 200 / 0.15), transparent)" }} />
      <div className="relative z-10 w-full max-w-md space-y-4">
        <AuthBrand />
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function ClerkQueryCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== uid) {
        qc.clear();
      }
      prevUserIdRef.current = uid;
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

function SessionTracker() {
  const { user } = useUser();
  useEffect(() => {
    if (user) {
      securityApi.upsertCurrentSession().catch(() => {});
    }
  }, [user?.id]);
  return null;
}

function WhitelistGate({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");
  const email = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    if (!user) return;
    if (!email) { setStatus("allowed"); return; }
    api.checkWhitelist(email).then((allowed) => setStatus(allowed ? "allowed" : "denied"));
  }, [user?.id, email]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            NEX0S-A1 · Verifying access…
          </div>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, oklch(0.64 0.25 25 / 0.08), transparent)" }} />
        <div className="relative z-10 text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-destructive mb-2">Access Denied</div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">NEX0S-A1: Unauthorized</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your account <span className="font-medium text-foreground">{email}</span> is not on the NEX0S-A1 whitelist.
              Contact an administrator to request access.
            </p>
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 font-mono text-[11px] text-muted-foreground text-left space-y-1">
            <div><span className="text-destructive">✗</span> whitelist_check: <span className="text-foreground">FAILED</span></div>
            <div><span className="text-muted-foreground/60">›</span> email: <span className="text-foreground">{email}</span></div>
            <div><span className="text-muted-foreground/60">›</span> status: <span className="text-destructive">ACCESS_DENIED</span></div>
          </div>
          <button
            onClick={() => { window.location.href = `${basePath}/sign-in`; }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Sign in with a different account
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const routeMap: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  consultation: Consultation,
  synthesis: Synthesis,
  security: Security,
  deployment: Deployment,
  admin: Admin,
  mfa: MFA,
  sessions: Sessions,
  audit: Audit,
  "nexus-control": NexusControl,
};

function LazyRoute({ name }: { name: string }) {
  const Component = routeMap[name];
  if (!Component) return <NotFound />;
  return <Component />;
}

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex flex-1 min-w-0 overflow-hidden flex-col">
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
          <SidebarTrigger className="-ml-1" />
        </div>
        <div className="flex-1 p-6 overflow-auto">
          <Switch>
            <Route path="/dashboard" component={() => <LazyRoute name="dashboard" />} />
            <Route path="/consultation" component={() => <LazyRoute name="consultation" />} />
            <Route path="/synthesis" component={() => <LazyRoute name="synthesis" />} />
            <Route path="/security" component={() => <LazyRoute name="security" />} />
            <Route path="/deployment" component={() => <LazyRoute name="deployment" />} />
            <Route path="/admin" component={() => <LazyRoute name="admin" />} />
            <Route path="/admin/nexus-control" component={() => <LazyRoute name="nexus-control" />} />
            <Route path="/mfa" component={() => <LazyRoute name="mfa" />} />
            <Route path="/sessions" component={() => <LazyRoute name="sessions" />} />
            <Route path="/audit" component={() => <LazyRoute name="audit" />} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </SidebarProvider>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden px-4">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% -20%, oklch(0.78 0.18 200 / 0.18), transparent)" }} />
          <div className="relative z-10 text-center space-y-6 max-w-lg px-4">
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
                <Hexagon className="h-10 w-10 text-primary" strokeWidth={1.5} />
                <div>
                  <div className="text-4xl font-bold tracking-widest text-foreground">NEX0S-A1</div>
                  <div className="font-mono text-xs text-muted-foreground">AI Synthesis Platform · v2.0</div>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">AI-powered software synthesis platform</p>
            <div className="flex gap-3 justify-center">
              <a href={`${basePath}/sign-in`} className="rounded-lg bg-gradient-to-r from-primary to-accent px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
                Sign In
              </a>
              <a href={`${basePath}/sign-up`} className="rounded-lg border border-primary/40 px-6 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}

function ProtectedLayout() {
  return (
    <>
      <Show when="signed-in">
        <WhitelistGate>
          <AuthProvider>
            <SessionTracker />
            <AppLayout />
          </AuthProvider>
        </WhitelistGate>
      </Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/dashboard" component={ProtectedLayout} />
      <Route path="/consultation" component={ProtectedLayout} />
      <Route path="/synthesis" component={ProtectedLayout} />
      <Route path="/security" component={ProtectedLayout} />
      <Route path="/deployment" component={ProtectedLayout} />
      <Route path="/admin" component={ProtectedLayout} />
      <Route path="/admin/nexus-control" component={ProtectedLayout} />
      <Route path="/mfa" component={ProtectedLayout} />
      <Route path="/sessions" component={ProtectedLayout} />
      <Route path="/audit" component={ProtectedLayout} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={clerkLocalization}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
          <SonnerToaster position="top-right" theme="dark" />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
