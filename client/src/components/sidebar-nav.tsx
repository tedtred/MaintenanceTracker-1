import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { UserRole, AvailablePages } from "@shared/schema";

const items = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    id: AvailablePages.DASHBOARD,
  },
  {
    title: "Work Orders",
    icon: ClipboardList,
    href: "/work-orders",
    id: AvailablePages.WORK_ORDERS,
  },
  {
    title: "Assets",
    icon: Wrench,
    href: "/assets",
    id: AvailablePages.ASSETS,
  },
  {
    title: "Maintenance Calendar",
    icon: Calendar,
    href: "/maintenance-calendar",
    id: AvailablePages.MAINTENANCE_CALENDAR,
  },
  {
    title: "Analytics",
    icon: BarChart,
    href: "/maintenance-analytics",
    id: AvailablePages.MAINTENANCE_ANALYTICS,
  },
  {
    title: "Problem Tracking",
    icon: AlertTriangle,
    href: "/problem-tracking",
    id: AvailablePages.PROBLEM_TRACKING,
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
    id: AvailablePages.SETTINGS,
  },
];

export function SidebarNav() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

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
    navItems = [...items, { title: "Admin Panel", icon: Users, href: "/admin", id: "admin" }];
  } else {
    // Filter items based on permissions
    navItems = items.filter(item => 
      // Always show dashboard
      item.id === AvailablePages.DASHBOARD || 
      // Show pages that user has permission to access
      userPermissions.includes(item.id)
    );
  }

  return (
    <div className="relative border-r bg-sidebar h-screen w-52 flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold">CMMS</h2>
        <p className="text-sm text-sidebar-foreground mt-1">
          Welcome, {user?.username}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={location === item.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  location === item.href && "bg-sidebar-accent"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <div className="flex items-center justify-between mb-4">
          <ThemeToggle />
          <Button
            variant="ghost"
            className="justify-start gap-2"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}