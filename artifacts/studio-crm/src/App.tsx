import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import ClientPortal from "@/pages/client-portal";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Photographers from "@/pages/photographers";
import CreativeDetail from "@/pages/creative-detail";
import Settings from "@/pages/settings";
import Services from "@/pages/services";
import Leads from "@/pages/leads";
import Accounting from "@/pages/accounting";
import WorkflowTemplates from "@/pages/workflow-templates";
import ClientAccounts from "@/pages/client-accounts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component, roles }: { component: React.ComponentType; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && roles && !roles.includes(user.role)) {
      setLocation(user.role === "client" ? "/client-portal" : "/dashboard");
    }
  }, [user, isLoading, roles, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground animate-pulse">{t("loadingApp")}</div>
      </div>
    );
  }

  if (!user || (roles && !roles.includes(user.role))) {
    return null;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user && location !== "/login" && location !== "/") {
        setLocation("/login");
      } else if (user && (location === "/login" || location === "/")) {
        setLocation(user.role === "client" ? "/client-portal" : "/dashboard");
      }
    }
  }, [user, isLoading, location, setLocation]);

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard">
          {() => <ProtectedRoute component={Dashboard} roles={["admin", "photographer"]} />}
        </Route>
        <Route path="/client-portal">
          {() => <ProtectedRoute component={ClientPortal} roles={["client"]} />}
        </Route>
        <Route path="/clients/:id">
          {() => <ProtectedRoute component={ClientDetail} roles={["admin", "photographer"]} />}
        </Route>
        <Route path="/clients">
          {() => <ProtectedRoute component={Clients} roles={["admin", "photographer"]} />}
        </Route>
        <Route path="/projects/:id">
          {() => <ProtectedRoute component={ProjectDetail} roles={["admin", "photographer"]} />}
        </Route>
        <Route path="/projects">
          {() => <ProtectedRoute component={Projects} roles={["admin", "photographer"]} />}
        </Route>
        <Route path="/services">
          {() => <ProtectedRoute component={Services} roles={["admin", "photographer"]} />}
        </Route>
        <Route path="/photographers/:id">
          {() => <ProtectedRoute component={CreativeDetail} roles={["admin"]} />}
        </Route>
        <Route path="/photographers">
          {() => <ProtectedRoute component={Photographers} roles={["admin"]} />}
        </Route>
        <Route path="/settings">
          {() => <ProtectedRoute component={Settings} roles={["admin"]} />}
        </Route>
        <Route path="/leads">
          {() => <ProtectedRoute component={Leads} roles={["admin", "photographer"]} />}
        </Route>
        <Route path="/accounting">
          {() => <ProtectedRoute component={Accounting} roles={["admin", "photographer"]} />}
        </Route>
        <Route path="/workflow-templates">
          {() => <ProtectedRoute component={WorkflowTemplates} roles={["admin"]} />}
        </Route>
        <Route path="/client-accounts">
          {() => <ProtectedRoute component={ClientAccounts} roles={["admin"]} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
