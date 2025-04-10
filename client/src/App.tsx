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
import DashboardNew from "@/pages/dashboard-new";
import WorkOrders from "@/pages/work-orders";
import WorkOrdersNew from "@/pages/work-orders-new";
import WorkOrderDetails from "@/pages/work-order-details";
import Assets from "@/pages/assets";
import AssetsNew from "@/pages/assets-new";
import MaintenanceCalendar from "@/pages/maintenance-calendar";
import MaintenanceCalendarNew from "@/pages/maintenance-calendar-new";
import MaintenanceAnalytics from "@/pages/maintenance-analytics";
import AdminPage from "@/pages/admin";
import ProblemTracking from "@/pages/problem-tracking";
import ProblemTrackingNew from "@/pages/problem-tracking-new";
import ProblemTrackingAdmin from "@/pages/problem-tracking-admin";
import ProblemTrackingAdminNew from "@/pages/problem-tracking-admin-new";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardNew} />
      <ProtectedRoute path="/dashboard-old" component={Dashboard} />
      <ProtectedRoute path="/work-orders" component={WorkOrdersNew} />
      <ProtectedRoute path="/work-orders-old" component={WorkOrders} />
      <ProtectedRoute path="/work-orders/:id" component={WorkOrderDetails} />
      <ProtectedRoute path="/assets" component={AssetsNew} />
      <ProtectedRoute path="/assets-old" component={Assets} />
      <ProtectedRoute path="/maintenance-calendar" component={MaintenanceCalendarNew} />
      <ProtectedRoute path="/maintenance-calendar-old" component={MaintenanceCalendar} />
      <ProtectedRoute path="/maintenance-analytics" component={MaintenanceAnalytics} />
      <ProtectedRoute path="/problem-tracking" component={ProblemTrackingNew} />
      <ProtectedRoute path="/problem-tracking-old" component={ProblemTracking} />
      <ProtectedRoute path="/problem-tracking-admin" component={ProblemTrackingAdminNew} />
      <ProtectedRoute path="/problem-tracking-admin-old" component={ProblemTrackingAdmin} />
      <ProtectedRoute path="/admin" component={AdminPage} />
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