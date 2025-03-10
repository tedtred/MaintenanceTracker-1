import { SidebarNav } from "@/components/sidebar-nav";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from "recharts";
import { format, parseISO, startOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset, WorkOrder, MaintenanceCompletion, WorkOrderStatus, AssetStatus } from "@shared/schema";
import { Loader2 } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-[300px]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export default function MaintenanceAnalytics() {
  // Fetch all required data
  const { data: maintenanceCompletions = [], isLoading: isLoadingCompletions } = useQuery<MaintenanceCompletion[]>({
    queryKey: ["/api/maintenance-completions"],
  });

  const { data: workOrders = [], isLoading: isLoadingWorkOrders } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: assets = [], isLoading: isLoadingAssets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const isLoading = isLoadingCompletions || isLoadingWorkOrders || isLoadingAssets;

  // Prepare data for monthly completion trend
  const last6Months = eachMonthOfInterval({
    start: startOfMonth(subMonths(new Date(), 5)),
    end: startOfMonth(new Date())
  });

  const monthlyCompletions = last6Months.map(month => {
    const completions = maintenanceCompletions.filter(completion => 
      startOfMonth(parseISO(completion.completedDate)).getTime() === month.getTime()
    );

    return {
      month: format(month, 'MMM yyyy'),
      count: completions.length,
      name: format(month, 'MMMM yyyy') // Full month name for tooltip
    };
  });

  // Prepare work order status distribution
  const workOrderStatusData = Object.values(WorkOrderStatus).map(status => ({
    name: status,
    value: workOrders.filter(wo => wo.status === status).length
  }));

  // Prepare asset status distribution
  const assetStatusData = Object.values(AssetStatus).map(status => ({
    name: status,
    value: assets.filter(asset => asset.status === status).length
  }));

  // Calculate average completion time for work orders
  const completedWorkOrders = workOrders.filter(wo => 
    wo.status === WorkOrderStatus.COMPLETED && wo.completedDate && wo.reportedDate
  );

  const averageCompletionTime = completedWorkOrders.reduce((acc, wo) => {
    const completionTime = new Date(wo.completedDate!).getTime() - new Date(wo.reportedDate).getTime();
    return acc + completionTime;
  }, 0) / (completedWorkOrders.length || 1);

  const averageDays = Math.round(averageCompletionTime / (1000 * 60 * 60 * 24));

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Maintenance Analytics</h1>
            <p className="text-muted-foreground">
              Visualizing maintenance trends and performance metrics
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Monthly Maintenance Completions */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Maintenance Completions</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <LoadingSpinner /> : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyCompletions}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis 
                          dataKey="month" 
                          stroke="var(--foreground)"
                          tick={{ fill: 'var(--foreground)' }}
                        />
                        <YAxis 
                          stroke="var(--foreground)"
                          tick={{ fill: 'var(--foreground)' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Completions"
                          stroke="#0088FE"
                          strokeWidth={2}
                          dot={{ fill: '#0088FE' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Order Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Work Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <LoadingSpinner /> : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={workOrderStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {workOrderStatusData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]}
                              stroke="var(--background)"
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Asset Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <LoadingSpinner /> : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={assetStatusData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis 
                          dataKey="name" 
                          stroke="var(--foreground)"
                          tick={{ fill: 'var(--foreground)' }}
                        />
                        <YAxis 
                          stroke="var(--foreground)"
                          tick={{ fill: 'var(--foreground)' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar 
                          dataKey="value" 
                          name="Assets" 
                          fill="#00C49F"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Work Order Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <LoadingSpinner /> : (
                  <div className="grid grid-cols-2 gap-4 p-4">
                    <div className="space-y-2 text-center p-4 rounded-lg bg-muted">
                      <h3 className="text-2xl font-bold text-primary">
                        {averageDays} days
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Average Completion Time
                      </p>
                    </div>
                    <div className="space-y-2 text-center p-4 rounded-lg bg-muted">
                      <h3 className="text-2xl font-bold text-primary">
                        {completedWorkOrders.length}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Total Completed Orders
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}