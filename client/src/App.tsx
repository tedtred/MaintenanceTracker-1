import { AuthProvider } from "@/hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Switch, Route } from "wouter";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "@/components/theme-provider";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import WorkOrders from "@/pages/work-orders";
import WorkOrderDetails from "@/pages/work-order-details";
import Assets from "@/pages/assets";
import MaintenanceCalendar from "@/pages/maintenance-calendar";
import MaintenanceAnalytics from "@/pages/maintenance-analytics";
import AdminPage from "@/pages/admin";
import Settings from "@/pages/Settings"; // Add Settings import

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/work-orders" component={WorkOrders} />
      <ProtectedRoute path="/work-orders/:id" component={WorkOrderDetails} />
      <ProtectedRoute path="/assets" component={Assets} />
      <ProtectedRoute path="/maintenance-calendar" component={MaintenanceCalendar} />
      <ProtectedRoute path="/maintenance-analytics" component={MaintenanceAnalytics} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/settings" component={Settings} /> {/* Add Settings route */}
      <Route component={NotFound} />
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