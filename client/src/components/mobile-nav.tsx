import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Calendar,
  LogOut,
  Users,
  BarChart,
  Settings,
  AlertTriangle,
  Menu,
} from "lucide-react";
import { UserRole, AvailablePages } from "@shared/schema";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

// Navigation items shared between mobile and desktop
const items = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    id: AvailablePages.DASHBOARD,
    showInMobileBar: true,
  },
  {
    title: "Work Orders",
    icon: ClipboardList,
    href: "/work-orders",
    id: AvailablePages.WORK_ORDERS,
    showInMobileBar: true,
  },
  {
    title: "Assets",
    icon: Wrench,
    href: "/assets",
    id: AvailablePages.ASSETS,
    showInMobileBar: false,
  },
  {
    title: "Maintenance",
    icon: Calendar,
    href: "/maintenance-calendar",
    id: AvailablePages.MAINTENANCE_CALENDAR,
    showInMobileBar: false,
  },
  {
    title: "Analytics",
    icon: BarChart,
    href: "/maintenance-analytics",
    id: AvailablePages.MAINTENANCE_ANALYTICS,
    showInMobileBar: false,
  },
  {
    title: "Problems",
    icon: AlertTriangle,
    href: "/problem-tracking",
    id: AvailablePages.PROBLEM_TRACKING,
    showInMobileBar: true,
  },
];

export function MobileNav() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();

  // Parse user permissions
  let userPermissions: string[] = [];
  if (user && user.role !== UserRole.ADMIN) {
    try {
      userPermissions = JSON.parse(user.pagePermissions || '[]');
    } catch (error) {
      console.error('Error parsing user permissions:', error);
    }
  }

  // For admin users, show all pages plus admin page
  // For non-admin users, filter pages based on permissions
  let navItems = [];
  
  if (user?.role === UserRole.ADMIN) {
    navItems = [...items, { 
      title: "Admin", 
      icon: Users, 
      href: "/admin", 
      id: "admin",
      showInMobileBar: false
    }];
  } else {
    // Filter items based on permissions
    navItems = items.filter(item => 
      // Always show dashboard
      item.id === AvailablePages.DASHBOARD || 
      // Show pages that user has permission to access
      userPermissions.includes(item.id)
    );
  }

  // For mobile bottom bar, we only show a subset of the most important items
  const mobileBottomNavItems = navItems.filter(item => item.showInMobileBar);

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-card border-t border-border flex items-center justify-around">
        {mobileBottomNavItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "flex flex-col h-full pt-2 pb-1 px-3 rounded-none",
                location === item.href && "bg-primary/10 text-primary"
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs">{item.title}</span>
            </Button>
          </Link>
        ))}

        {/* Menu Button triggers drawer with full navigation */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="flex flex-col h-full pt-2 pb-1 px-3 rounded-none"
            >
              <Menu className="h-5 w-5 mb-1" />
              <span className="text-xs">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85%] max-w-xs p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <h2 className="font-semibold">CMMS</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Welcome, {user?.username}
                </p>
              </div>
              <ScrollArea className="flex-1 px-2 py-4">
                <div className="space-y-1">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={location === item.href ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-2",
                          location === item.href && "bg-primary/10"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </Button>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t mt-auto">
                <div className="flex items-center justify-between mb-4">
                  <ThemeToggle />
                  <Button
                    variant="ghost"
                    className="justify-start gap-2"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Add bottom padding on mobile to account for the navigation bar */}
      <div className="sm:hidden pb-16" />
    </>
  );
}