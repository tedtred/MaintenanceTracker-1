import { SidebarNav } from "@/components/sidebar-nav";
import { StatsCard } from "@/components/stats-card";
import { useQuery } from "@tanstack/react-query";
import { 
  WorkOrder, 
  Asset, 
  WorkOrderStatus, 
  AssetStatus, 
  MaintenanceSchedule, 
  MaintenanceCompletion,
  Settings 
} from "@shared/schema";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar as CalendarIcon,
  Info,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const [selectedTab, setSelectedTab] = useState<string>("today");
  const isMobile = useIsMobile();

  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });
  
  const { data: schedules = [] } = useQuery<MaintenanceSchedule[]>({
    queryKey: ["/api/maintenance-schedules"],
  });
  
  const { data: completions = [] } = useQuery<MaintenanceCompletion[]>({
    queryKey: ["/api/maintenance-completions"],
  });
  
  const { data: settings } = useQuery<Settings>({
    queryKey: ['/api/settings'],
  });

  // Filter out archived work orders
  const activeWorkOrders = workOrders.filter(
    (wo) => wo.status !== WorkOrderStatus.ARCHIVED
  );

  // Calculate statistics from active work orders only
  const openWorkOrders = activeWorkOrders.filter(
    (wo) => wo.status === WorkOrderStatus.OPEN
  ).length;
  const inProgressWorkOrders = activeWorkOrders.filter(
    (wo) => wo.status === WorkOrderStatus.IN_PROGRESS
  ).length;
  const completedWorkOrders = activeWorkOrders.filter(
    (wo) => wo.status === WorkOrderStatus.COMPLETED
  ).length;
  const assetsNeedingMaintenance = assets.filter(
    (asset) => asset.status === AssetStatus.MAINTENANCE
  ).length;
  
  // Calculate maintenance statistics
  const getAssetName = (assetId: number) => {
    const asset = assets.find(a => a.id === assetId);
    return asset ? asset.name : 'Unknown Asset';
  };
  
  // Create maintenance tasks for today, upcoming, and overdue
  const maintenanceTasks: Array<{
    id: string;
    title: string;
    assetName: string;
    date: Date;
    isOverdue: boolean;
    scheduleId: number;
    daysOverdue?: number;
  }> = [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Process schedules to generate tasks
  schedules.forEach(schedule => {
    const assetName = getAssetName(schedule.assetId);
    let startDate = new Date(schedule.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = schedule.endDate ? new Date(schedule.endDate) : new Date(today);
    endDate.setFullYear(endDate.getFullYear() + 1); // Look ahead 1 year max
    
    // Check if we should generate a task based on frequency and past completions
    let currentDate = new Date(startDate);
    
    while (currentDate <= today) {
      // Check if this task was completed
      const isCompleted = completions.some(
        completion =>
          completion.scheduleId === schedule.id &&
          format(new Date(completion.completedDate), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
      );
      
      if (!isCompleted) {
        const daysOverdue = differenceInDays(today, currentDate);
        
        if (daysOverdue >= 0) {
          maintenanceTasks.push({
            id: `${schedule.id}-${currentDate.toISOString()}`,
            title: schedule.title,
            assetName,
            date: new Date(currentDate),
            isOverdue: daysOverdue > 0,
            daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
            scheduleId: schedule.id
          });
        }
      }
      
      // Move to next occurrence based on frequency
      switch (schedule.frequency) {
        case 'DAILY':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'WEEKLY':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'MONTHLY':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'QUARTERLY':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        case 'SEMI_ANNUALLY':
          currentDate.setMonth(currentDate.getMonth() + 6);
          break;
        case 'ANNUALLY':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
        default:
          currentDate = new Date(endDate); // Exit the loop
      }
    }
  });
  
  // Sort by overdue status (overdue first) and then by date
  maintenanceTasks.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.date.getTime() - b.date.getTime();
  });
  
  // Filter tasks based on selected tab
  const filteredTasks = maintenanceTasks.filter(task => {
    if (selectedTab === "today") {
      return isToday(task.date) || task.isOverdue;
    } else if (selectedTab === "overdue") {
      return task.isOverdue;
    } else {
      return true; // all
    }
  });
  
  const overdueTasks = maintenanceTasks.filter(task => task.isOverdue);
  const todayTasks = maintenanceTasks.filter(task => isToday(task.date));

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your maintenance operations
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Overdue Maintenance"
              value={overdueTasks.length}
              icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
              description="Tasks requiring immediate attention"
              className="border-destructive/20 bg-destructive/5"
            />
            <StatsCard
              title="Today's Tasks"
              value={todayTasks.length}
              icon={<Clock className="h-5 w-5 text-primary" />}
              description="Scheduled for today"
            />
            <StatsCard
              title="Open Work Orders"
              value={openWorkOrders}
              icon={<ClipboardList className="h-5 w-5 text-amber-500" />}
              description="Pending tickets"
            />
            <StatsCard
              title="In Progress"
              value={inProgressWorkOrders}
              icon={<Wrench className="h-5 w-5 text-blue-500" />}
              description="Work orders being addressed"
            />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  Maintenance Agenda
                  <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-auto">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="today" className="text-xs">Today & Overdue</TabsTrigger>
                      <TabsTrigger value="overdue" className="text-xs">Overdue Only</TabsTrigger>
                      <TabsTrigger value="all" className="text-xs">All Tasks</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardTitle>
                <CardDescription>
                  Scheduled maintenance requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map(task => {
                        // Get schedule details once
                        const schedule = schedules.find(s => s.id === task.scheduleId);
                        
                        return (
                          <div 
                            key={task.id}
                            className={`p-4 border rounded-lg transition-colors ${
                              task.isOverdue ? 'bg-destructive/5 border-destructive/30' : 'bg-card hover:bg-accent/50'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-1 h-8 rounded-full ${task.isOverdue ? 'bg-destructive' : 'bg-primary'}`}></div>
                                <div>
                                  <div className="font-semibold text-base">{task.title}</div>
                                  <div className="text-sm">
                                    Asset: <span className="font-medium">{task.assetName}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {task.isOverdue && (
                                  <Badge variant="destructive" className="text-xs">
                                    {task.daysOverdue} {task.daysOverdue === 1 ? 'day' : 'days'} overdue
                                  </Badge>
                                )}
                                <div className="text-sm font-medium whitespace-nowrap">
                                  {format(task.date, 'MMM dd, yyyy')}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                              <div>
                                <span className="font-medium text-muted-foreground">Status:</span>{' '}
                                {schedule?.status || 'Active'}
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">Frequency:</span>{' '}
                                {schedule?.frequency.replace('_', ' ').toLowerCase() || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">Started:</span>{' '}
                                {schedule ? format(new Date(schedule.startDate), 'MMM dd, yyyy') : 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">Task Status:</span>{' '}
                                <span className={task.isOverdue ? 'text-destructive font-medium' : 'text-primary font-medium'}>
                                  {task.isOverdue ? 'Overdue' : 'Due Today'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="mt-3 text-sm">
                              <span className="font-medium text-muted-foreground">Description:</span>{' '}
                              <span className="text-sm">{schedule?.description || 'No description provided.'}</span>
                            </div>
                            
                            <div className="mt-3 flex justify-end">
                              <Link href={`/maintenance-calendar`}>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-xs"
                                >
                                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                                  View in Calendar
                                </Button>
                              </Link>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-center h-32 text-muted-foreground">
                        No maintenance tasks to display
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  Recent Work Orders
                  <Link href="/work-orders">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </CardTitle>
                <CardDescription>
                  Latest maintenance tickets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {activeWorkOrders.length > 0 ? (
                      activeWorkOrders.slice(0, 6).map((wo) => (
                        <div
                          key={wo.id}
                          className={`p-3 border rounded-lg flex items-center justify-between ${
                            wo.status === WorkOrderStatus.OPEN 
                              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30' 
                              : wo.status === WorkOrderStatus.IN_PROGRESS
                                ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30'
                                : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30'
                          } transition-colors`}
                        >
                          <div className="overflow-hidden">
                            <div className="font-medium truncate">{wo.title}</div>
                            <div className="text-xs text-muted-foreground">
                              Priority: {wo.priority} | Reported: {format(new Date(wo.reportedDate), 'MMM dd')}
                            </div>
                          </div>
                          <Badge 
                            variant={
                              wo.status === WorkOrderStatus.OPEN 
                                ? 'outline' 
                                : wo.status === WorkOrderStatus.IN_PROGRESS
                                  ? 'secondary'
                                  : 'default'
                            }
                            className="ml-2"
                          >
                            {wo.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-32 text-muted-foreground">
                        No work orders to display
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}