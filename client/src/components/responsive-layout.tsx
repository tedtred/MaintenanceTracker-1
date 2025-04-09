import { ReactNode } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileNav } from "@/components/mobile-nav";

interface ResponsiveLayoutProps {
  children: ReactNode;
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 px-4 sm:px-6 md:px-8 pt-4 pb-4 sm:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}