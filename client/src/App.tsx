import { AuthProvider } from "@/hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import WorkOrders from "@/pages/work-orders";
import WorkOrderDetails from "@/pages/work-order-details";
import Assets from "@/pages/assets";
import MaintenanceCalendar from "@/pages/maintenance-calendar";
import MaintenanceAnalytics from "@/pages/maintenance-analytics";
import AdminPage from "@/pages/admin";
import ProblemTracking from "@/pages/problem-tracking";
import ProblemTrackingAdmin from "@/pages/problem-tracking-admin";
import SettingsPage from "@/pages/Settings";

// HomeRedirect component to handle root path redirection based on user permissions
function HomeRedirect() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  
  // Get settings to check for default landing pages
  const { data: settings } = useQuery({
    queryKey: ['/api/settings']
  });
  
  useEffect(() => {
    if (isLoading || !user) return;
    
    // Admin users always go to dashboard
    if (user.role === UserRole.ADMIN) {
      setRedirectPath("/dashboard");
      return;
    }
    
    try {
      // Parse user permissions
      const userPermissions = JSON.parse(user.pagePermissions || '[]');
      
      // Get user-specific default landing page from settings
      if (settings?.roleDefaultPages) {
        try {
          const defaultPages = JSON.parse(settings.roleDefaultPages || '{}');
          
          // Check if there's a role-specific default landing page
          if (defaultPages[user.role] && userPermissions.includes(defaultPages[user.role])) {
            setRedirectPath(`/${defaultPages[user.role]}`);
            return;
          }
        } catch (e) {
          console.error("Error parsing default pages:", e);
        }
      }
      
      // Check if user has dashboard access as a fallback
      if (userPermissions.includes("dashboard")) {
        setRedirectPath("/dashboard");
        return;
      }
      
      // If no default page set or accessible, use first available permission
      if (userPermissions.length > 0) {
        setRedirectPath(`/${userPermissions[0]}`);
        return;
      }
      
      // Last resort: access denied page (will be handled by protected route)
      setRedirectPath("/dashboard");
      
    } catch (error) {
      console.error('Error determining default page:', error);
      setRedirectPath("/dashboard");
    }
  }, [user, isLoading, settings, setLocation]);
  
  if (isLoading || !redirectPath) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  return <Redirect to={redirectPath} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={HomeRedirect} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/work-orders" component={WorkOrders} />
      <ProtectedRoute path="/work-orders/:id" component={WorkOrderDetails} />
      <ProtectedRoute path="/assets" component={Assets} />
      <ProtectedRoute path="/maintenance-calendar" component={MaintenanceCalendar} />
      <ProtectedRoute path="/maintenance-analytics" component={MaintenanceAnalytics} />
      <ProtectedRoute path="/problem-tracking" component={ProblemTracking} />
      <ProtectedRoute path="/problem-tracking-admin" component={ProblemTrackingAdmin} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="*">
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="cmms-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;