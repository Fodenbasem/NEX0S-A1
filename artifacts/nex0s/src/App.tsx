import { useEffect, useRef } from "react";
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
import NotFound from "@/pages/not-found";

import Dashboard from "@/routes/_app/dashboard";
import Consultation from "@/routes/_app/consultation";
import Synthesis from "@/routes/_app/synthesis";
import Security from "@/routes/_app/security";
import Deployment from "@/routes/_app/deployment";
import Admin from "@/routes/_app/admin";
import MFA from "@/routes/_app/mfa";
import Sessions from "@/routes/_app/sessions";
import Audit from "@/routes/_app/audit";

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

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1 mb-6">
          <div className="flex items-center justify-center gap-2">
            <div className="text-2xl font-bold tracking-widest text-foreground">NEX0S</div>
            <div className="font-mono text-xs text-muted-foreground">A1</div>
          </div>
          <div className="text-sm text-muted-foreground">AI-powered software synthesis platform</div>
        </div>
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1 mb-6">
          <div className="flex items-center justify-center gap-2">
            <div className="text-2xl font-bold tracking-widest text-foreground">NEX0S</div>
            <div className="font-mono text-xs text-muted-foreground">A1</div>
          </div>
          <div className="text-sm text-muted-foreground">AI-powered software synthesis platform</div>
        </div>
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
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-6 max-w-lg px-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-widest text-foreground">NEX0S A1</h1>
              <p className="text-muted-foreground">AI-powered software synthesis platform</p>
            </div>
            <div className="flex gap-3 justify-center">
              <a href={`${basePath}/sign-in`} className="rounded-lg bg-gradient-to-r from-primary to-accent px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">Sign In</a>
              <a href={`${basePath}/sign-up`} className="rounded-lg border border-primary/40 px-6 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition">Get Started</a>
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
        <AuthProvider>
          <SessionTracker />
          <AppLayout />
        </AuthProvider>
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
