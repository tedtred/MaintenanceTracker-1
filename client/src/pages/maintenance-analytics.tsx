import { useState } from "react";
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
import { format, parseISO, startOfMonth, eachMonthOfInterval, subMonths, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset, WorkOrder, MaintenanceCompletion, WorkOrderStatus, AssetStatus } from "@shared/schema";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-[300px]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const EmptyState = () => (
  <div className="flex items-center justify-center h-[300px] text-center">
    <div className="space-y-2">
      <p className="text-lg font-medium text-muted-foreground">No data available</p>
      <p className="text-sm text-muted-foreground">Start creating work orders to see analytics</p>
    </div>
  </div>
);

// Custom label component for the pie chart
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5; // Reduced from 1.4 to 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="var(--foreground)"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export default function MaintenanceAnalytics() {
  const [timeRange, setTimeRange] = useState<"30" | "90" | "180" | "365">("90");

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

  // Filter work orders based on time range
  const filteredWorkOrders = workOrders.filter(wo => {
    const orderDate = new Date(wo.reportedDate);
    const daysAgo = differenceInDays(new Date(), orderDate);
    return daysAgo <= parseInt(timeRange);
  });

  // Prepare data for monthly completion trend
  const last6Months = eachMonthOfInterval({
    start: startOfMonth(subMonths(new Date(), 5)),
    end: startOfMonth(new Date())
  });

  // Fix date handling in monthly completions data
  const monthlyCompletions = last6Months.map(month => {
    const completions = maintenanceCompletions.filter(completion =>
      startOfMonth(new Date(completion.completedDate)).getTime() === month.getTime()
    );

    return {
      month: format(month, 'MMM yyyy'),
      count: completions.length,
      name: format(month, 'MMMM yyyy')
    };
  });

  // Work order metrics
  const completedWorkOrders = workOrders.filter(wo =>
    wo.status === WorkOrderStatus.COMPLETED && wo.completedDate && wo.reportedDate
  );

  const averageCompletionTime = completedWorkOrders.reduce((acc, wo) => {
    const completionTime = new Date(wo.completedDate!).getTime() - new Date(wo.reportedDate).getTime();
    return acc + completionTime;
  }, 0) / (completedWorkOrders.length || 1);

  const averageDays = Math.round(averageCompletionTime / (1000 * 60 * 60 * 24));

  // Prepare work order priority distribution
  const priorityData = filteredWorkOrders.reduce((acc: any[], wo) => {
    const priority = wo.priority?.toUpperCase() || 'UNSPECIFIED';
    const existing = acc.find(item => item.name === priority);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: priority, value: 1 });
    }
    return acc;
  }, []);

  // Prepare equipment breakdown
  const equipmentData = filteredWorkOrders.reduce((acc: any[], wo) => {
    if (!wo.assetId) return acc;
    const asset = assets.find(a => a.id === wo.assetId);
    if (!asset) return acc;

    const existing = acc.find(item => item.name === asset.category);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: asset.category, value: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  // Prepare asset status distribution
  const assetStatusData = Object.values(AssetStatus)
    .map(status => ({
      name: status,
      value: assets.filter(asset => asset.status === status).length
    }))
    .filter(item => item.value > 0);

  // Update status checks to use correct enum values
  const statusCounts = {
    total: filteredWorkOrders.length,
    completed: filteredWorkOrders.filter(wo => wo.status === WorkOrderStatus.COMPLETED).length,
    open: filteredWorkOrders.filter(wo => wo.status === WorkOrderStatus.OPEN).length,
    inProgress: filteredWorkOrders.filter(wo => wo.status === WorkOrderStatus.IN_PROGRESS).length
  };

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
      <div>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Maintenance Analytics</h1>
              <p className="text-muted-foreground">
                Visualizing maintenance trends and performance metrics
              </p>
            </div>
            <Select
              value={timeRange}
              onValueChange={(value: "30" | "90" | "180" | "365") => setTimeRange(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="180">Last 180 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Performance Summary Cards */}
          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Work Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statusCounts.total}
                </div>
                <p className="text-xs text-muted-foreground">
                  in the last {timeRange} days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statusCounts.completed}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average completion: {averageDays} days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Open Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statusCounts.open}
                </div>
                <p className="text-xs text-muted-foreground">
                  awaiting assignment
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statusCounts.inProgress}
                </div>
                <p className="text-xs text-muted-foreground">
                  currently being worked on
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {/* Work Order Priority Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Work Order Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingSpinner />
                ) : priorityData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {priorityData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                              stroke="var(--background)"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          verticalAlign="middle"
                          align="right"
                          layout="vertical"
                          formatter={(value) => (
                            <span className="text-sm font-medium">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Equipment Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Equipment Type Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingSpinner />
                ) : equipmentData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={equipmentData}>
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
                          name="Work Orders"
                          fill="#00C49F"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
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
          </div>


          {/* Work Order Performance (moved here for better layout) */}
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
  );
}