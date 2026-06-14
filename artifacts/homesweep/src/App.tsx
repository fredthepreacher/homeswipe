import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PreviewProvider, usePreview, type PreviewRole } from "@/context/PreviewContext";

// Auth pages
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
import ForgotPassword from "@/pages/ForgotPassword";

// Consumer pages
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import Saved from "@/pages/Saved";
import Profile from "@/pages/Profile";
import ConversationThread from "@/pages/ConversationThread";
import Preferences from "@/pages/Preferences";
import NotFound from "@/pages/not-found";

// Broker / Landlord pages
import BrokerDashboard from "@/pages/broker/BrokerDashboard";
import BrokerListings from "@/pages/broker/BrokerListings";
import BrokerAddListing from "@/pages/broker/BrokerAddListing";
import BrokerInquiries from "@/pages/broker/BrokerInquiries";
import BrokerProfile from "@/pages/broker/BrokerProfile";
import BrokerMessages from "@/pages/broker/BrokerMessages";
import BrokerConversationThread from "@/pages/broker/BrokerConversationThread";

// Admin pages
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminListings from "@/pages/admin/AdminListings";
import AdminAuditLog from "@/pages/admin/AdminAuditLog";

// Nav + Preview components
import { BottomNav } from "@/components/BottomNav";
import { BrokerBottomNav } from "@/components/BrokerBottomNav";
import { AdminNav } from "@/components/AdminNav";
import { AdminPreviewBar } from "@/components/AdminPreviewBar";

const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function isProfessional(role?: string) { return role === "broker" || role === "landlord"; }
function isAdmin(role?: string)        { return role === "admin"; }

function homeFor(role?: string) {
  if (isAdmin(role))        return "/admin";
  if (isProfessional(role)) return "/broker";
  return "/";
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { previewRole }     = usePreview();
  const [location]          = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAuthPage = AUTH_PATHS.some((p) => location === p || location.startsWith(p + "/"));

  if (!user && !isAuthPage) return <Redirect to="/login" />;
  if (user && isAuthPage) {
    // In preview mode auth pages redirect to the preview home, not admin
    if (isAdmin(user.role) && previewRole) {
      return <Redirect to={previewRole === "consumer" ? "/" : "/broker"} />;
    }
    return <Redirect to={homeFor(user.role)} />;
  }

  return <>{children}</>;
}

/* ── Consumer UI ────────────────────────────────────── */
function ConsumerRouter() {
  const [location] = useLocation();
  const isAuthPage = AUTH_PATHS.some((p) => location === p || location.startsWith(p + "/"));
  return (
    <>
      <Switch>
        <Route path="/login"           component={Login} />
        <Route path="/signup"          component={SignUp} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/"                component={Home} />
        <Route path="/search"          component={Search} />
        <Route path="/saved"           component={Saved} />
        <Route path="/profile"         component={Profile} />
        <Route path="/preferences"     component={Preferences} />
        <Route path="/messages/new/:listingId">
          {(params) => <ConversationThread newListingId={params.listingId} />}
        </Route>
        <Route path="/messages/:id">
          {(params) => <ConversationThread conversationId={params.id} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
      {!isAuthPage && <BottomNav />}
    </>
  );
}

/* ── Broker / Landlord UI ───────────────────────────── */
function BrokerRouter() {
  const [location] = useLocation();
  const isAuthPage = AUTH_PATHS.some((p) => location === p || location.startsWith(p + "/"));
  const isThread   = /^\/broker\/messages\/\d+/.test(location);
  return (
    <>
      <Switch>
        <Route path="/login"              component={Login} />
        <Route path="/signup"             component={SignUp} />
        <Route path="/forgot-password"    component={ForgotPassword} />
        <Route path="/broker"             component={BrokerDashboard} />
        <Route path="/broker/listings"    component={BrokerListings} />
        <Route path="/broker/add-listing" component={BrokerAddListing} />
        <Route path="/broker/inquiries"   component={BrokerInquiries} />
        <Route path="/broker/messages"    component={BrokerMessages} />
        <Route path="/broker/messages/:id">
          {(params) => <BrokerConversationThread conversationId={params.id!} />}
        </Route>
        <Route path="/broker/profile"     component={BrokerProfile} />
        <Route path="/"                   component={() => <Redirect to="/broker" />} />
        <Route component={NotFound} />
      </Switch>
      {!isAuthPage && !isThread && <BrokerBottomNav />}
    </>
  );
}

/* ── Admin UI ───────────────────────────────────────── */
function AdminRouter() {
  return (
    <>
      <Switch>
        <Route path="/login"           component={Login} />
        <Route path="/signup"          component={SignUp} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/admin"           component={AdminOverview} />
        <Route path="/admin/users"     component={AdminUsers} />
        <Route path="/admin/listings"  component={AdminListings} />
        <Route path="/admin/audit"     component={AdminAuditLog} />
        <Route path="/"                component={() => <Redirect to="/admin" />} />
        <Route component={NotFound} />
      </Switch>
      <AdminNav />
    </>
  );
}

/* ── Root router — picks UI based on role + preview ── */
function AppRouter() {
  const { user }        = useAuth();
  const { previewRole } = usePreview();
  const [, navigate]    = useLocation();
  const prevRole        = useRef<PreviewRole>(null);

  // When preview role changes, navigate to that role's home
  useEffect(() => {
    if (previewRole && previewRole !== prevRole.current) {
      navigate(previewRole === "consumer" ? "/" : "/broker");
    }
    if (!previewRole && prevRole.current) {
      navigate("/admin");
    }
    prevRole.current = previewRole;
  }, [previewRole]);

  if (isAdmin(user?.role)) {
    if (previewRole === "consumer")                       return <ConsumerRouter />;
    if (previewRole === "broker" || previewRole === "landlord") return <BrokerRouter />;
    return <AdminRouter />;
  }
  if (isProfessional(user?.role)) return <BrokerRouter />;
  return <ConsumerRouter />;
}

/* ── Shell — adds preview bar at the top when active ─ */
function AppShell() {
  const { user }        = useAuth();
  const { previewRole } = usePreview();
  const isPreview       = isAdmin(user?.role) && previewRole !== null;

  return (
    <div className="mx-auto max-w-md bg-background min-h-screen shadow-2xl relative overflow-hidden ring-1 ring-border sm:my-8 sm:rounded-[3rem] sm:h-[844px] sm:min-h-0 flex flex-col">
      {/* Preview bar — sticky at top, always visible */}
      {isPreview && <AdminPreviewBar />}

      {/* Content area fills remaining space */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <AuthGuard>
          <AppRouter />
        </AuthGuard>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PreviewProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppShell />
            </WouterRouter>
          </AuthProvider>
        </PreviewProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
