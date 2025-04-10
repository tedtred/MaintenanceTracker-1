import { useState } from "react";
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
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { format, parseISO, startOfMonth, eachMonthOfInterval, subMonths, differenceInDays, subDays, isSameDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ArrowUpRight, Wrench, Calendar, Clock, CheckCircle2, BarChart4 } from "lucide-react";

// Import our schema types
import { 
  WorkOrderStatus, 
  AssetStatus, 
  MaintenanceFrequency,
  MaintenanceStatus
} from "@shared/schema";

// Import our modular data hooks
import { useWorkOrders } from "@/hooks/use-work-order-data";
import { useMaintenanceSchedules } from "@/hooks/use-maintenance-data";
import { useAssets } from "@/hooks/use-asset-data";
import { useProblemTracking } from "@/hooks/use-problem-tracking-data";

// Import our data loader component
import { DataLoader, MultiQueryLoader } from "@/components/data-loader";

// Chart colors
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];
const STATUS_COLORS = {
  OPEN: "#f97316",
  IN_PROGRESS: "#3b82f6",
  COMPLETED: "#22c55e",
  ARCHIVED: "#6b7280",
};

// Maintenance frequency constants to ensure correct values
const MAINTENANCE_FREQUENCY = {
  DAILY: MaintenanceFrequency.DAILY,
  WEEKLY: MaintenanceFrequency.WEEKLY,
  MONTHLY: MaintenanceFrequency.MONTHLY,
  QUARTERLY: MaintenanceFrequency.QUARTERLY,
  BIANNUAL: MaintenanceFrequency.BIANNUAL,
  YEARLY: MaintenanceFrequency.YEARLY,
  TWO_YEAR: MaintenanceFrequency.TWO_YEAR
};

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: any) {
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
}

// Custom label component for pie charts
function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
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
}

// Main component
export default function MaintenanceAnalyticsNew() {
  const [timeRange, setTimeRange] = useState<"7" | "30" | "90" | "180" | "365">("90");
  const [activeTab, setActiveTab] = useState("overview");

  // Use our modular hooks to fetch all required data
  const { workOrdersQuery } = useWorkOrders();
  const { schedulesQuery, completionsQuery } = useMaintenanceSchedules();
  const { assetsQuery } = useAssets();
  const { eventsQuery, buttonsQuery } = useProblemTracking();

  return (
    <div className="container py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Analytics</h1>
          <p className="text-muted-foreground">
            Visualizing maintenance trends and performance metrics
          </p>
        </div>
        <Select
          value={timeRange}
          onValueChange={(value: "7" | "30" | "90" | "180" | "365") => setTimeRange(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="180">Last 180 Days</SelectItem>
            <SelectItem value="365">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MultiQueryLoader
        queries={[workOrdersQuery, schedulesQuery, completionsQuery, assetsQuery, eventsQuery, buttonsQuery]}
        errorComponent={(errors) => (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium">Failed to load analytics data</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Please try refreshing the page
            </p>
          </div>
        )}
      >
        {() => (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="problems">Problem Reports</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <OverviewTabContent 
                workOrders={workOrdersQuery.data || []}
                assets={assetsQuery.data || []}
                schedules={schedulesQuery.data || []}
                completions={completionsQuery.data || []} 
                problemEvents={eventsQuery.data || []}
                timeRange={timeRange}
              />
            </TabsContent>

            {/* Work Orders Tab */}
            <TabsContent value="work-orders" className="space-y-6">
              <WorkOrdersTabContent 
                workOrders={workOrdersQuery.data || []}
                assets={assetsQuery.data || []}
                timeRange={timeRange}
              />
            </TabsContent>

            {/* Maintenance Tab */}
            <TabsContent value="maintenance" className="space-y-6">
              <MaintenanceTabContent
                schedules={schedulesQuery.data || []}
                completions={completionsQuery.data || []}
                assets={assetsQuery.data || []}
                timeRange={timeRange}
              />
            </TabsContent>

            {/* Problem Reports Tab */}
            <TabsContent value="problems" className="space-y-6">
              <ProblemReportsTabContent
                problemEvents={eventsQuery.data || []}
                problemButtons={buttonsQuery.data || []}
                assets={assetsQuery.data || []}
                workOrders={workOrdersQuery.data || []}
                timeRange={timeRange}
              />
            </TabsContent>
          </Tabs>
        )}
      </MultiQueryLoader>
    </div>
  );
}

// Tab Content Components
function OverviewTabContent({ 
  workOrders, 
  assets, 
  schedules, 
  completions, 
  problemEvents,
  timeRange 
}: {
  workOrders: any[];
  assets: any[];
  schedules: any[];
  completions: any[];
  problemEvents: any[];
  timeRange: string;
}) {
  // Filter data by time range
  const startDate = subDays(new Date(), parseInt(timeRange));
  
  // Work order metrics
  const filteredWorkOrders = workOrders.filter(wo => {
    const orderDate = new Date(wo.reportedDate);
    return orderDate >= startDate;
  });

  const completedWorkOrders = filteredWorkOrders.filter(wo =>
    wo.status === WorkOrderStatus.COMPLETED && wo.completedDate && wo.reportedDate
  );

  const averageCompletionTime = completedWorkOrders.reduce((acc, wo) => {
    const completionTime = new Date(wo.completedDate!).getTime() - new Date(wo.reportedDate).getTime();
    return acc + completionTime;
  }, 0) / (completedWorkOrders.length || 1);

  const averageDays = Math.round(averageCompletionTime / (1000 * 60 * 60 * 24));

  // Problem report metrics
  const filteredProblems = problemEvents.filter(event => {
    const eventDate = new Date(event.timestamp);
    return eventDate >= startDate;
  });

  const openProblems = filteredProblems.filter(event => !event.resolved);
  const resolvedProblems = filteredProblems.filter(event => event.resolved);

  // Maintenance completion metrics
  const filteredCompletions = completions.filter(completion => {
    const completionDate = new Date(completion.completedDate);
    return completionDate >= startDate;
  });

  // Asset metrics
  const needsMaintenanceCount = assets.filter(asset => 
    asset.status === AssetStatus.MAINTENANCE
  ).length;

  const operationalCount = assets.filter(asset => 
    asset.status === AssetStatus.OPERATIONAL
  ).length;

  return (
    <>
      {/* Performance Overview Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Work Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredWorkOrders.length}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <p>in the last {timeRange} days</p>
              {filteredWorkOrders.length > 0 && (
                <span className="inline-flex items-center ml-2 text-emerald-500">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              )}
            </div>
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
              {completedWorkOrders.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Average completion: {averageDays} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maintenance Tasks Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCompletions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              in the last {timeRange} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Problem Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredProblems.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {openProblems.length} open / {resolvedProblems.length} resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Status Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Operational", value: operationalCount },
                    { name: "Needs Maintenance", value: needsMaintenanceCount },
                    { name: "Offline", value: assets.filter(a => a.status === AssetStatus.OFFLINE).length },
                    { name: "Decommissioned", value: assets.filter(a => a.status === AssetStatus.DECOMMISSIONED).length },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  label={CustomPieLabel}
                >
                  {assets.length > 0 ? ([
                    <Cell key="cell-0" fill="#4ade80" stroke="var(--background)" />,
                    <Cell key="cell-1" fill="#f97316" stroke="var(--background)" />,
                    <Cell key="cell-2" fill="#f43f5e" stroke="var(--background)" />,
                    <Cell key="cell-3" fill="#6b7280" stroke="var(--background)" />,
                  ]) : null}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Work Orders", completed: completedWorkOrders.length, open: filteredWorkOrders.length - completedWorkOrders.length },
                  { name: "Problem Reports", completed: resolvedProblems.length, open: openProblems.length },
                  { name: "Maintenance Tasks", completed: filteredCompletions.length, open: schedules.filter(s => s.status !== MaintenanceStatus.COMPLETED).length },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="completed" name="Completed" fill="#22c55e" stackId="a" />
                <Bar dataKey="open" name="Open/Pending" fill="#f97316" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function WorkOrdersTabContent({ workOrders, assets, timeRange }: { workOrders: any[], assets: any[], timeRange: string }) {
  // Filter data by time range
  const startDate = subDays(new Date(), parseInt(timeRange));
  
  const filteredWorkOrders = workOrders.filter(wo => {
    const orderDate = new Date(wo.reportedDate);
    return orderDate >= startDate;
  });

  // Prepare data for status distribution
  const statusData = Object.values(WorkOrderStatus).map(status => ({
    name: status.replace('_', ' '),
    value: filteredWorkOrders.filter(wo => wo.status === status).length
  })).filter(item => item.value > 0);

  // Prepare data for priority distribution
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

  // Prepare data for equipment breakdown
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

  // Prepare daily trend data
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'MMM dd');
    
    return {
      date: dateStr,
      new: filteredWorkOrders.filter(wo => {
        const reportDate = new Date(wo.reportedDate);
        return isSameDay(reportDate, date);
      }).length,
      completed: filteredWorkOrders.filter(wo => {
        if (!wo.completedDate) return false;
        const completeDate = new Date(wo.completedDate);
        return isSameDay(completeDate, date);
      }).length
    };
  }).reverse();

  // Calculate completion time stats
  const completedWorkOrders = filteredWorkOrders.filter(wo =>
    wo.status === WorkOrderStatus.COMPLETED && wo.completedDate && wo.reportedDate
  );

  const averageCompletionTime = completedWorkOrders.reduce((acc, wo) => {
    const completionTime = new Date(wo.completedDate!).getTime() - new Date(wo.reportedDate).getTime();
    return acc + completionTime;
  }, 0) / (completedWorkOrders.length || 1);

  const averageDays = Math.round(averageCompletionTime / (1000 * 60 * 60 * 24));

  const statusCounts = {
    total: filteredWorkOrders.length,
    completed: filteredWorkOrders.filter(wo => wo.status === WorkOrderStatus.COMPLETED).length,
    open: filteredWorkOrders.filter(wo => wo.status === WorkOrderStatus.OPEN).length,
    inProgress: filteredWorkOrders.filter(wo => wo.status === WorkOrderStatus.IN_PROGRESS).length
  };

  return (
    <>
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Work Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Work Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {statusData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Wrench className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">No work orders in selected period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    labelLine={false}
                    label={CustomPieLabel}
                  >
                    {statusData.map((entry, index) => {
                      const status = Object.keys(WorkOrderStatus).find(
                        key => WorkOrderStatus[key as keyof typeof WorkOrderStatus] === entry.name.replace(' ', '_')
                      );
                      const color = status ? STATUS_COLORS[status as keyof typeof STATUS_COLORS] : COLORS[index % COLORS.length];
                      return <Cell key={`cell-${index}`} fill={color} stroke="var(--background)" />;
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Work Order Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Work Order Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {priorityData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Wrench className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">No work orders in selected period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    labelLine={false}
                    label={CustomPieLabel}
                  >
                    {priorityData.map((entry, index) => {
                      let color = COLORS[index % COLORS.length];
                      if (entry.name === 'CRITICAL') color = '#ef4444';
                      if (entry.name === 'HIGH') color = '#f97316';
                      if (entry.name === 'MEDIUM') color = '#eab308';
                      if (entry.name === 'LOW') color = '#22c55e';
                      
                      return <Cell key={`cell-${index}`} fill={color} stroke="var(--background)" />;
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Equipment Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {equipmentData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Wrench className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">No asset data for work orders</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        {/* Daily Work Order Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Work Order Activity</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--foreground)"
                  tick={{ fill: 'var(--foreground)' }}
                />
                <YAxis
                  stroke="var(--foreground)"
                  tick={{ fill: 'var(--foreground)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="new"
                  name="New Orders"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Work Order Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Work Order Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
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
            <div className="space-y-2 text-center p-4 rounded-lg bg-muted">
              <h3 className="text-2xl font-bold text-primary">
                {filteredWorkOrders.filter(wo => wo.status === WorkOrderStatus.OPEN).length}
              </h3>
              <p className="text-sm text-muted-foreground">
                Pending Orders
              </p>
            </div>
            <div className="space-y-2 text-center p-4 rounded-lg bg-muted">
              <h3 className="text-2xl font-bold text-primary">
                {Math.round((statusCounts.completed / statusCounts.total) * 100) || 0}%
              </h3>
              <p className="text-sm text-muted-foreground">
                Completion Rate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function MaintenanceTabContent({ 
  schedules, 
  completions, 
  assets,
  timeRange 
}: { 
  schedules: any[]; 
  completions: any[]; 
  assets: any[];
  timeRange: string;
}) {
  // Filter data by time range
  const startDate = subDays(new Date(), parseInt(timeRange));
  
  const filteredCompletions = completions.filter(completion => {
    const completionDate = new Date(completion.completedDate);
    return completionDate >= startDate;
  });

  // Prepare data for monthly completion trend
  const last6Months = eachMonthOfInterval({
    start: startOfMonth(subMonths(new Date(), 5)),
    end: startOfMonth(new Date())
  });

  const monthlyCompletions = last6Months.map(month => {
    const monthlyCompletions = filteredCompletions.filter(completion =>
      startOfMonth(new Date(completion.completedDate)).getTime() === month.getTime()
    );

    return {
      month: format(month, 'MMM yyyy'),
      count: monthlyCompletions.length,
      name: format(month, 'MMMM yyyy')
    };
  });

  // Prepare maintenance frequency distribution
  const frequencyData = schedules.reduce((acc: any[], schedule) => {
    const existing = acc.find(item => item.name === schedule.frequency);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: schedule.frequency, value: 1 });
    }
    return acc;
  }, []);

  // Get maintenance completion rate
  const totalSchedules = schedules.length;
  const completedSchedules = schedules.filter(s => s.status === MaintenanceStatus.COMPLETED).length;
  const completionRate = totalSchedules > 0 ? Math.round((completedSchedules / totalSchedules) * 100) : 0;

  // Format frequency labels for display
  const formatFrequencyLabel = (frequency: string): string => {
    switch (frequency) {
      case MAINTENANCE_FREQUENCY.DAILY: return "Daily";
      case MAINTENANCE_FREQUENCY.WEEKLY: return "Weekly";
      case MAINTENANCE_FREQUENCY.MONTHLY: return "Monthly";
      case MAINTENANCE_FREQUENCY.QUARTERLY: return "Quarterly";
      case MAINTENANCE_FREQUENCY.BIANNUAL: return "Bi-Annual";
      case MAINTENANCE_FREQUENCY.YEARLY: return "Yearly";
      case MAINTENANCE_FREQUENCY.TWO_YEAR: return "2-Year";
      default: return frequency;
    }
  };

  // Calculate assets with upcoming maintenance
  const assetsWithUpcomingMaintenance = assets.filter(asset => {
    const assetSchedules = schedules.filter(s => s.assetId === asset.id);
    return assetSchedules.some(s => s.status !== MaintenanceStatus.COMPLETED);
  }).length;

  return (
    <>
      {/* Performance Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Maintenance Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedules.length}
            </div>
            <p className="text-xs text-muted-foreground">
              across {assets.length} assets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCompletions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              in the last {timeRange} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completionRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              of scheduled maintenance tasks
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assets Needing Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assetsWithUpcomingMaintenance}
            </div>
            <p className="text-xs text-muted-foreground">
              have upcoming schedules
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Maintenance Completions */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Maintenance Completions</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
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
          </CardContent>
        </Card>

        {/* Maintenance Frequency Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Frequency Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {frequencyData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">No maintenance tasks configured</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={frequencyData.map(item => ({
                      ...item,
                      name: formatFrequencyLabel(item.name)
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    labelLine={false}
                    label={CustomPieLabel}
                  >
                    {frequencyData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="var(--background)" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Completion Details */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Task Completion Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            <div className="space-y-2 text-center p-4 rounded-lg bg-muted">
              <h3 className="text-2xl font-bold text-primary">
                {schedules.filter(s => s.status === MaintenanceStatus.OVERDUE).length}
              </h3>
              <p className="text-sm text-muted-foreground">
                Overdue Tasks
              </p>
            </div>
            <div className="space-y-2 text-center p-4 rounded-lg bg-muted">
              <h3 className="text-2xl font-bold text-primary">
                {schedules.filter(s => s.status === MaintenanceStatus.SCHEDULED).length}
              </h3>
              <p className="text-sm text-muted-foreground">
                Scheduled Tasks
              </p>
            </div>
            <div className="space-y-2 text-center p-4 rounded-lg bg-muted">
              <h3 className="text-2xl font-bold text-primary">
                {schedules.filter(s => s.status === MaintenanceStatus.IN_PROGRESS).length}
              </h3>
              <p className="text-sm text-muted-foreground">
                In Progress Tasks
              </p>
            </div>
            <div className="space-y-2 text-center p-4 rounded-lg bg-muted">
              <h3 className="text-2xl font-bold text-primary">
                {schedules.filter(s => s.affectsAssetStatus).length}
              </h3>
              <p className="text-sm text-muted-foreground">
                Critical Tasks (Affects Asset Status)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ProblemReportsTabContent({ 
  problemEvents, 
  problemButtons, 
  assets,
  workOrders,
  timeRange 
}: { 
  problemEvents: any[]; 
  problemButtons: any[]; 
  assets: any[];
  workOrders: any[];
  timeRange: string;
}) {
  // Filter data by time range
  const startDate = subDays(new Date(), parseInt(timeRange));
  
  const filteredEvents = problemEvents.filter(event => {
    const eventDate = new Date(event.timestamp);
    return eventDate >= startDate;
  });

  // Prepare button usage data
  const buttonUsageData = problemButtons.map(button => {
    const usage = filteredEvents.filter(event => event.buttonId === button.id).length;
    return {
      id: button.id,
      name: button.label,
      color: button.color,
      value: usage
    };
  }).sort((a, b) => b.value - a.value);

  // Count resolved vs unresolved problems
  const resolvedEvents = filteredEvents.filter(event => event.resolved);
  const unresolvedEvents = filteredEvents.filter(event => !event.resolved);

  // Calculate average resolution time
  const averageResolutionTime = resolvedEvents.reduce((acc, event) => {
    if (!event.resolvedTimestamp) return acc;
    const resolveTime = new Date(event.resolvedTimestamp).getTime() - new Date(event.timestamp).getTime();
    return acc + resolveTime;
  }, 0) / (resolvedEvents.length || 1);

  const averageResolutionHours = Math.round(averageResolutionTime / (1000 * 60 * 60));

  // Calculate auto-created work orders from problems
  const workOrdersFromProblems = workOrders.filter(wo => wo.problemEventId).length;

  // Prepare daily problem events data
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'MMM dd');
    
    return {
      date: dateStr,
      reported: filteredEvents.filter(event => {
        const eventDate = new Date(event.timestamp);
        return isSameDay(eventDate, date);
      }).length,
      resolved: filteredEvents.filter(event => {
        if (!event.resolvedTimestamp) return false;
        const resolveDate = new Date(event.resolvedTimestamp);
        return isSameDay(resolveDate, date);
      }).length
    };
  }).reverse();

  return (
    <>
      {/* Problem Reports Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Problem Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredEvents.length}
            </div>
            <p className="text-xs text-muted-foreground">
              in the last {timeRange} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved Problems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resolvedEvents.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Average resolution: {averageResolutionHours} hours
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Problems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {unresolvedEvents.length}
            </div>
            <p className="text-xs text-muted-foreground">
              awaiting resolution
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Work Orders Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workOrdersFromProblems}
            </div>
            <p className="text-xs text-muted-foreground">
              from problem reports
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Problem Button Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Problem Button Usage</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {buttonUsageData.length === 0 || buttonUsageData.every(item => item.value === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">No problem events reported</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buttonUsageData}>
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
                    name="Reports"
                    radius={[4, 4, 0, 0]}
                  >
                    {buttonUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Problem Resolution Status */}
        <Card>
          <CardHeader>
            <CardTitle>Problem Resolution Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">No problem events reported</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Resolved", value: resolvedEvents.length },
                      { name: "Open", value: unresolvedEvents.length }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    labelLine={false}
                    label={CustomPieLabel}
                  >
                    <Cell fill="#22c55e" stroke="var(--background)" />
                    <Cell fill="#f97316" stroke="var(--background)" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Problem Report Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Problem Report Activity</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--foreground)"
                tick={{ fill: 'var(--foreground)' }}
              />
              <YAxis
                stroke="var(--foreground)"
                tick={{ fill: 'var(--foreground)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="reported"
                name="Reported Problems"
                stroke="#f97316"
                fill="#f97316"
                fillOpacity={0.2}
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved Problems"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Problem Resolution Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Problem Resolution Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            <div className="space-y-2 text-center p-4 rounded-lg bg-muted">
              <h3 className="text-2xl font-bold text-primary">
                {averageResolutionHours} hrs
              </h3>
              <p className="text-sm text-muted-foreground">
                Average Resolution Time
              </p>
            </div>
            <div className="space-y-2 text-center p-4 rounded-lg bg-muted">
              <h3 className="text-2xl font-bold text-primary">
                {Math.round((resolvedEvents.length / (filteredEvents.length || 1)) * 100)}%
              </h3>
              <p className="text-sm text-muted-foreground">
                Resolution Rate
              </p>
            </div>
            <div className="space-y-2 text-center p-4 rounded-lg bg-muted">
              <h3 className="text-2xl font-bold text-primary">
                {workOrdersFromProblems}
              </h3>
              <p className="text-sm text-muted-foreground">
                Auto-created Work Orders
              </p>
            </div>
            <div className="space-y-2 text-center p-4 rounded-lg bg-muted">
              <h3 className="text-2xl font-bold text-primary">
                {problemButtons.filter(b => b.active).length}
              </h3>
              <p className="text-sm text-muted-foreground">
                Active Problem Buttons
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}