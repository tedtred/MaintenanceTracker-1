import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { Redirect, Route } from "wouter";
import { UserRole, AvailablePages } from "@shared/schema";
import { ResponsiveLayout } from "@/components/responsive-layout";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element | null;
}) {
  const { user, isLoading } = useAuth();
  
  // Extract page ID from path (remove leading slash)
  const pageId = path.substring(1) || "dashboard";

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Admin users always have access to all pages
  if (user.role === UserRole.ADMIN) {
    return (
      <Route path={path}>
        <ResponsiveLayout>
          <Component />
        </ResponsiveLayout>
      </Route>
    );
  }

  // For non-admin users, check page permissions
  let userPermissions: string[] = [];
  try {
    userPermissions = JSON.parse(user.pagePermissions || '[]');
  } catch (error) {
    console.error('Error parsing user permissions:', error);
  }

  // If this page is in the user's permissions, allow access
  if (userPermissions.includes(pageId)) {
    return (
      <Route path={path}>
        <ResponsiveLayout>
          <Component />
        </ResponsiveLayout>
      </Route>
    );
  }

  // Otherwise, show access denied
  return (
    <Route path={path}>
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground">
          You don't have permission to access this page.
        </p>
      </div>
    </Route>
  );
}
