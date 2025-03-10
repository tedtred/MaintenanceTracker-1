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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function MaintenanceAnalytics() {
  // Fetch all required data
  const { data: maintenanceCompletions = [] } = useQuery<MaintenanceCompletion[]>({
    queryKey: ["/api/maintenance-completions"],
  });

  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  // Prepare data for monthly completion trend
  const last6Months = eachMonthOfInterval({
    start: startOfMonth(subMonths(new Date(), 5)),
    end: startOfMonth(new Date())
  });

  const monthlyCompletions = last6Months.map(month => {
    const completions = maintenanceCompletions.filter(completion => 
      startOfMonth(parseISO(completion.completedAt)).getTime() === month.getTime()
    );

    return {
      month: format(month, 'MMM yyyy'),
      count: completions.length
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

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8">
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
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyCompletions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Completions"
                        stroke="#0088FE"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Work Order Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Work Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workOrderStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {workOrderStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Asset Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assetStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Assets" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Average Completion Time */}
            <Card>
              <CardHeader>
                <CardTitle>Work Order Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-primary">
                      {averageDays} days
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Average time to complete work orders
                    </p>
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-primary">
                      {completedWorkOrders.length}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Total completed work orders
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
