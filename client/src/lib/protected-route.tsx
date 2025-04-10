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

  // Otherwise, show access denied with navigation options
  const { logoutMutation } = useAuth();
  
  // Find the appropriate landing page for the user
  const findFirstAccessiblePage = () => {
    if (!user || !user.pagePermissions) return "/";
    
    try {
      const userPermissions = JSON.parse(user.pagePermissions || '[]');
      
      // First, check if user has a default landing page and if they have permission to access it
      if (user.defaultLandingPage && userPermissions.includes(user.defaultLandingPage)) {
        return `/${user.defaultLandingPage}`;
      }
      
      // If no default landing page or not permitted, fall back to the first permission 
      if (userPermissions.length > 0) {
        return `/${userPermissions[0]}`;
      }
    } catch (error) {
      console.error('Error parsing user permissions:', error);
    }
    return "/";
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <Route path={path}>
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          You don't have permission to access this page.
        </p>
        
        <div className="flex gap-4">
          <a 
            href={findFirstAccessiblePage()}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Go to Home
          </a>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            Log Out
          </button>
        </div>
      </div>
    </Route>
  );
}
