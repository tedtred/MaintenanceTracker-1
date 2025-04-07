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
  BarChart, // Added BarChart icon for analytics
} from "lucide-react";
import { UserRole } from "@shared/schema";

const items = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    title: "Work Orders",
    icon: ClipboardList,
    href: "/work-orders",
  },
  {
    title: "Assets",
    icon: Wrench,
    href: "/assets",
  },
  {
    title: "Maintenance Calendar",
    icon: Calendar,
    href: "/maintenance-calendar",
  },
  {
    title: "Analytics",
    icon: BarChart,
    href: "/maintenance-analytics",
  },
];

export function SidebarNav() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  // Add admin page to navigation items if user is admin
  const navItems = user?.role === UserRole.ADMIN 
    ? [...items, { title: "User Management", icon: Users, href: "/admin" }]
    : items;

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