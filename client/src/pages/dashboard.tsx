import { SidebarNav } from "@/components/sidebar-nav";
import { StatsCard } from "@/components/stats-card";
import { useQuery } from "@tanstack/react-query";
import { WorkOrder, Asset, WorkOrderStatus, AssetStatus } from "@shared/schema";
import {
  ClipboardList,
  Wrench,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export default function Dashboard() {
  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  // Filter out archived work orders
  const activeWorkOrders = workOrders.filter(
    (wo) => wo.status !== WorkOrderStatus.ARCHIVED
  );

  // Calculate statistics from active work orders only
  const openWorkOrders = activeWorkOrders.filter(
    (wo) => wo.status === WorkOrderStatus.OPEN
  ).length;
  const completedWorkOrders = activeWorkOrders.filter(
    (wo) => wo.status === WorkOrderStatus.COMPLETED
  ).length;
  const assetsNeedingMaintenance = assets.filter(
    (asset) => asset.status === AssetStatus.MAINTENANCE
  ).length;
  const operationalAssets = assets.filter(
    (asset) => asset.status === AssetStatus.OPERATIONAL
  ).length;

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your maintenance operations
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Open Work Orders"
              value={openWorkOrders}
              icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
              description="Pending maintenance tasks"
            />
            <StatsCard
              title="Completed Orders"
              value={completedWorkOrders}
              icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
              description="Successfully resolved tasks"
            />
            <StatsCard
              title="Assets Need Maintenance"
              value={assetsNeedingMaintenance}
              icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
              description="Equipment requiring attention"
            />
            <StatsCard
              title="Operational Assets"
              value={operationalAssets}
              icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
              description="Fully functional equipment"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Recent Work Orders</h2>
              <div className="space-y-2">
                {activeWorkOrders.slice(0, 5).map((wo) => (
                  <div
                    key={wo.id}
                    className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="font-medium">{wo.title}</div>
                    <div className="text-sm text-muted-foreground">
                      Status: {wo.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Asset Overview</h2>
              <div className="space-y-2">
                {assets.slice(0, 5).map((asset) => (
                  <div
                    key={asset.id}
                    className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Status: {asset.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}