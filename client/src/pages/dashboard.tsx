import { useState } from "react";
import { Link } from "wouter";
import { z } from "zod";
import { format, isToday, differenceInDays } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  WorkOrderStatus,
  WorkOrderPriority,
  MaintenanceStatus,
  MaintenanceFrequency,
} from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StatsCard } from "@/components/stats-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  ClipboardList,
  Clock,
  Info,
  CheckCircle2,
  Wrench,
} from "lucide-react";

// Import our new modular hooks
import { useWorkOrders } from "@/hooks/use-work-order-data";
import { useMaintenanceSchedules } from "@/hooks/use-maintenance-data";
import { useAssets } from "@/hooks/use-asset-data";
import { DataLoader, MultiQueryLoader } from "@/components/data-loader";

// Local maintenance frequency constants to ensure correct values
const MAINTENANCE_FREQUENCY = {
  DAILY: MaintenanceFrequency.DAILY,
  WEEKLY: MaintenanceFrequency.WEEKLY,
  MONTHLY: MaintenanceFrequency.MONTHLY,
  QUARTERLY: MaintenanceFrequency.QUARTERLY,
  BIANNUAL: MaintenanceFrequency.BIANNUAL, // Replace misnamed frequencies
  YEARLY: MaintenanceFrequency.YEARLY,
  TWO_YEAR: MaintenanceFrequency.TWO_YEAR
};

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("today");
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Use our modular hooks
  const { 
    workOrdersQuery, 
    updateWorkOrderMutation 
  } = useWorkOrders();
  
  const { 
    schedulesQuery, 
    completionsQuery, 
    completeMaintenanceMutation 
  } = useMaintenanceSchedules();
  
  const { assetsQuery } = useAssets();

  // Form for maintenance completion
  const formSchema = z.object({
    notes: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
    },
  });

  // Handle opening the details dialog
  const openDetailsDialog = (task: any) => {
    setSelectedTask(task);
    setSelectedSchedule(task.schedule);
    setIsDetailsDialogOpen(true);
  };

  // Handle clicking the complete button
  const handleCompleteClick = () => {
    setIsDetailsDialogOpen(false);
    setIsCompleteDialogOpen(true);
  };

  // Get asset details by ID
  const getAssetDetails = (assetId: number) => {
    if (!Array.isArray(assetsQuery.data)) return null;
    return assetsQuery.data.find((asset) => asset.id === assetId);
  };

  // Get asset name by ID (for display)
  const getAssetName = (assetId: number) => {
    const asset = getAssetDetails(assetId);
    return asset ? asset.name : "Unknown Asset";
  };

  // Get completion history for a schedule
  const getCompletionHistory = (scheduleId: number) => {
    if (!Array.isArray(completionsQuery.data)) return [];
    return completionsQuery.data
      .filter((completion) => completion.scheduleId === scheduleId)
      .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());
  };

  // Handle maintenance completion form submission
  const onSubmit = (data: any) => {
    if (selectedTask) {
      completeMaintenanceMutation.mutate({
        scheduleId: selectedTask.id,
        completedDate: new Date(),
        notes: data.notes || "",
      });
    }
  };

  // Process work orders
  const processWorkOrders = (workOrders: any[] | undefined) => {
    if (!Array.isArray(workOrders)) return { activeWorkOrders: [], openWorkOrders: 0, inProgressWorkOrders: 0 };
    
    const activeWorkOrders = workOrders.filter(
      (wo) => wo.status !== WorkOrderStatus.ARCHIVED
    );
    
    const openWorkOrders = workOrders.filter(
      (wo) => wo.status === WorkOrderStatus.OPEN
    ).length;
    
    const inProgressWorkOrders = workOrders.filter(
      (wo) => wo.status === WorkOrderStatus.IN_PROGRESS
    ).length;
    
    return { activeWorkOrders, openWorkOrders, inProgressWorkOrders };
  };

  // Process maintenance schedules and create task objects
  const processMaintenanceTasks = (schedules: any[] | undefined, completions: any[] | undefined) => {
    if (!Array.isArray(schedules)) return { maintenanceTasks: [], overdueTasks: [], todayTasks: [] };
    
    const maintenanceTasks = schedules
      .filter(schedule => schedule.status === MaintenanceStatus.SCHEDULED)
      .map(schedule => {
        const lastCompleted = Array.isArray(completions) 
          ? completions
              .filter(completion => completion.scheduleId === schedule.id)
              .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime())[0]
          : null;
        
        // Calculate the next due date based on frequency and last completion
        let dueDate = new Date(schedule.startDate);
        if (lastCompleted) {
          dueDate = new Date(lastCompleted.completedDate);
          
          switch (schedule.frequency) {
            case MAINTENANCE_FREQUENCY.DAILY:
              dueDate.setDate(dueDate.getDate() + 1);
              break;
            case MAINTENANCE_FREQUENCY.WEEKLY:
              dueDate.setDate(dueDate.getDate() + 7);
              break;
            case MAINTENANCE_FREQUENCY.MONTHLY:
              dueDate.setMonth(dueDate.getMonth() + 1);
              break;
            case MAINTENANCE_FREQUENCY.QUARTERLY:
              dueDate.setMonth(dueDate.getMonth() + 3);
              break;
            case MAINTENANCE_FREQUENCY.BIANNUAL:
              dueDate.setMonth(dueDate.getMonth() + 6);
              break;
            case MAINTENANCE_FREQUENCY.YEARLY:
              dueDate.setFullYear(dueDate.getFullYear() + 1);
              break;
            default:
              break;
          }
        }
        
        const isOverdue = dueDate < new Date();
        const daysOverdue = isOverdue ? differenceInDays(new Date(), dueDate) : 0;
        
        return {
          id: schedule.id,
          title: schedule.title,
          description: schedule.description,
          frequency: schedule.frequency,
          date: dueDate,
          isOverdue,
          daysOverdue,
          assetId: schedule.assetId,
          assetName: getAssetName(schedule.assetId),
          schedule: schedule,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const overdueTasks = maintenanceTasks.filter(task => task.isOverdue);
    const todayTasks = maintenanceTasks.filter(task => isToday(task.date));
    
    return { maintenanceTasks, overdueTasks, todayTasks };
  };

  // Sort work orders by priority status
  const sortWorkOrders = (workOrders: any[]) => {
    // Define priority order: OPEN first, then IN_PROGRESS, then WAITING_ON_PARTS, then others
    const statusPriority = {
      [WorkOrderStatus.OPEN]: 1,
      [WorkOrderStatus.IN_PROGRESS]: 2,
      [WorkOrderStatus.WAITING_ON_PARTS]: 3,
      [WorkOrderStatus.COMPLETED]: 4,
      [WorkOrderStatus.ARCHIVED]: 5
    };

    return [...workOrders].sort((a, b) => {
      // First sort by status priority
      const statusDiff = statusPriority[a.status as keyof typeof statusPriority] - 
                         statusPriority[b.status as keyof typeof statusPriority];
      if (statusDiff !== 0) return statusDiff;
      
      // Then sort by reported date (newest first)
      return new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime();
    });
  };

  // State for work order filter
  const [workOrderFilter, setWorkOrderFilter] = useState<string>("all");

  // Render the dashboard content
  const renderDashboardContent = () => {
    const { activeWorkOrders: unsortedWorkOrders, openWorkOrders, inProgressWorkOrders } = processWorkOrders(workOrdersQuery.data);
    const sortedWorkOrders = sortWorkOrders(unsortedWorkOrders);

    // Filter work orders based on selected filter
    const filteredWorkOrders = sortedWorkOrders ? sortedWorkOrders.filter(wo => {
      if (workOrderFilter === "all") return true;
      if (workOrderFilter === "open") return wo.status === WorkOrderStatus.OPEN;
      if (workOrderFilter === "in-progress") return wo.status === WorkOrderStatus.IN_PROGRESS;
      if (workOrderFilter === "waiting") return wo.status === WorkOrderStatus.WAITING_ON_PARTS;
      return true;
    }) : [];
    
    const { maintenanceTasks, overdueTasks, todayTasks } = processMaintenanceTasks(schedulesQuery.data, completionsQuery.data);

    // Filter tasks based on selected tab
    const filteredTasks = maintenanceTasks.filter((task) => {
      if (selectedTab === "today") {
        return task.isOverdue || isToday(task.date);
      } else if (selectedTab === "overdue") {
        return task.isOverdue;
      } else {
        return true; // all
      }
    });

    return (
      <>
        <div className="w-full">
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

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="col-span-2 md:col-span-1">
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
                  <ScrollArea className="h-[360px] pr-4">
                    <div className="space-y-3">
                      {filteredTasks.length > 0 ? (
                        filteredTasks.map(task => (
                          <div 
                            key={task.id}
                            onClick={() => openDetailsDialog(task)}
                            className={`p-3 border rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                              task.isOverdue ? 'bg-destructive/5 border-destructive/30 hover:bg-destructive/10' : 'bg-card hover:bg-accent/50'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-2">
                                <div className={`w-1 h-8 rounded-full ${task.isOverdue ? 'bg-destructive' : 'bg-primary'}`}></div>
                                <div>
                                  <div className="font-medium truncate">{task.title}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    Asset: {task.assetName}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {task.isOverdue && (
                                <Badge variant="destructive" className="text-xs">
                                  {task.daysOverdue} {task.daysOverdue === 1 ? 'day' : 'days'} overdue
                                </Badge>
                              )}
                              <div className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(task.date, 'MMM dd')}
                              </div>
                              <div className="h-6 w-6 flex items-center justify-center">
                                <Info className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                          No maintenance tasks to display
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="col-span-2 md:col-span-1">
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
                  <div className="flex mt-2 gap-2">
                    <Badge 
                      className="cursor-pointer" 
                      variant={workOrderFilter === "all" ? "secondary" : "outline"}
                      onClick={() => setWorkOrderFilter("all")}
                    >
                      All
                    </Badge>
                    <Badge 
                      className="cursor-pointer" 
                      variant={workOrderFilter === "open" ? "secondary" : "outline"}
                      onClick={() => setWorkOrderFilter("open")}
                    >
                      Open
                    </Badge>
                    <Badge 
                      className="cursor-pointer" 
                      variant={workOrderFilter === "in-progress" ? "secondary" : "outline"}
                      onClick={() => setWorkOrderFilter("in-progress")}
                    >
                      In Progress
                    </Badge>
                    <Badge 
                      className="cursor-pointer" 
                      variant={workOrderFilter === "waiting" ? "secondary" : "outline"}
                      onClick={() => setWorkOrderFilter("waiting")}
                    >
                      Waiting
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[360px] pr-4">
                    <div className="space-y-3">
                      {filteredWorkOrders.length > 0 ? (
                        filteredWorkOrders.slice(0, 10).map((wo) => (
                          <Link 
                            href={`/work-orders/${wo.id}`}
                            key={wo.id}
                            className="block"
                          >
                            <div
                              className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                                wo.status === WorkOrderStatus.OPEN 
                                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-950/30' 
                                  : wo.status === WorkOrderStatus.IN_PROGRESS
                                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-950/30'
                                    : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-950/30'
                              }`}
                            >
                              <div className="overflow-hidden">
                                <div className="font-medium truncate">{wo.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  Priority: {wo.priority} | Reported: {format(new Date(wo.reportedDate), 'MMM dd')}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    wo.status === WorkOrderStatus.OPEN 
                                      ? 'outline' 
                                      : wo.status === WorkOrderStatus.IN_PROGRESS
                                        ? 'secondary'
                                        : 'default'
                                  }
                                  className="whitespace-nowrap"
                                >
                                  {wo.status}
                                </Badge>
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                          No active work orders
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Maintenance Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedTask?.title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Frequency</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedTask?.frequency}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Next Due</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedTask?.date && format(selectedTask.date, 'MMM dd, yyyy')}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Status</div>
                  <div>
                    {selectedTask?.isOverdue ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : (
                      <Badge variant="outline">Scheduled</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Description</div>
                <div className="text-sm text-muted-foreground">
                  {selectedTask?.description || "No description provided"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Asset</div>
                <div className="text-sm">
                  {selectedTask?.assetName}
                </div>
              </div>
              {selectedTask && getCompletionHistory(selectedTask.id).length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Maintenance History</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCompletionHistory(selectedTask.id).map((completion) => (
                        <TableRow key={completion.id}>
                          <TableCell>{format(new Date(completion.completedDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{completion.notes || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleCompleteClick} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Mark Complete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Maintenance Dialog */}
        <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Maintenance Task</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter any notes about the maintenance performed"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={completeMaintenanceMutation.isPending}>
                    {completeMaintenanceMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  // Use our MultiQueryLoader to handle loading states for all queries
  return (
    <MultiQueryLoader
      queries={[workOrdersQuery, schedulesQuery, assetsQuery, completionsQuery]}
    >
      {renderDashboardContent()}
    </MultiQueryLoader>
  );
}