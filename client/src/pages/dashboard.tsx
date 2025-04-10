import { StatsCard } from "@/components/stats-card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  WorkOrder, 
  Asset, 
  WorkOrderStatus, 
  AssetStatus, 
  MaintenanceSchedule, 
  MaintenanceCompletion,
  Settings,
  InsertMaintenanceCompletion 
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [selectedTab, setSelectedTab] = useState<string>("today");
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

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
  
  const getAssetDetails = (assetId: number) => {
    return assets.find(a => a.id === assetId);
  };
  
  const getCompletionHistory = (scheduleId: number) => {
    return completions
      .filter(c => c.scheduleId === scheduleId)
      .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());
  };
  
  const form = useForm({
    defaultValues: {
      notes: "",
    },
  });
  
  const completeMaintenanceMutation = useMutation({
    mutationFn: async (data: InsertMaintenanceCompletion) => {
      const res = await apiRequest("POST", "/api/maintenance-completions", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-completions"] });
      setIsCompleteDialogOpen(false);
      setIsDetailsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Maintenance item marked as completed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleCompleteClick = () => {
    setIsDetailsDialogOpen(false);
    setIsCompleteDialogOpen(true);
  };
  
  const openDetailsDialog = (task: any) => {
    const schedule = schedules.find(s => s.id === task.scheduleId);
    if (schedule) {
      setSelectedSchedule(schedule);
      setSelectedTask(task);
      setIsDetailsDialogOpen(true);
    }
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
      <div>
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
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[360px] pr-4">
                  <div className="space-y-3">
                    {activeWorkOrders.length > 0 ? (
                      activeWorkOrders.slice(0, 10).map((wo) => (
                        <Link 
                          href={`/work-order-details/${wo.id}`}
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
                              >
                                {wo.status}
                              </Badge>
                              <div className="h-6 w-6 flex items-center justify-center">
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        </Link>
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
      
      {/* Maintenance Schedule Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Maintenance Schedule Details</span>
              <Button
                onClick={handleCompleteClick}
                variant="default"
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Complete
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-medium">Schedule Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Title</p>
                    <p>{selectedSchedule.title}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Frequency</p>
                    <p>{selectedSchedule.frequency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Start Date</p>
                    <p>{format(new Date(selectedSchedule.startDate), 'PPP')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">End Date</p>
                    <p>
                      {selectedSchedule.endDate
                        ? format(new Date(selectedSchedule.endDate), 'PPP')
                        : 'Ongoing'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Description</p>
                    <p className="whitespace-pre-wrap">{selectedSchedule.description}</p>
                  </div>
                </div>
              </div>

              {selectedSchedule.assetId && (
                <div className="space-y-2">
                  <h3 className="font-medium">Asset Information</h3>
                  {(() => {
                    const asset = getAssetDetails(selectedSchedule.assetId);
                    return asset ? (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Name</p>
                          <p>{asset.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Category</p>
                          <p>{asset.category}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Location</p>
                          <p>{asset.location}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p>{asset.status}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Asset information not available</p>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Completion History</h3>
                  <span className="text-sm text-muted-foreground">
                    Latest completions
                  </span>
                </div>
                <ScrollArea className="h-[200px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCompletionHistory(selectedSchedule.id).map((completion) => (
                        <TableRow key={completion.id}>
                          <TableCell>
                            {format(new Date(completion.completedDate), 'PPP')}
                          </TableCell>
                          <TableCell>{completion.notes || 'No notes'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Maintenance Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Maintenance Task</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => {
                  if (selectedTask && selectedSchedule) {
                    completeMaintenanceMutation.mutate({
                      scheduleId: selectedSchedule.id,
                      completedDate: selectedTask.date,
                      notes: data.notes,
                    });
                  }
                })}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Task: {selectedSchedule.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Asset: {getAssetName(selectedSchedule.assetId)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Date: {selectedTask ? format(selectedTask.date, 'PPPP') : ''}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Add any notes about the completed maintenance..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={completeMaintenanceMutation.isPending}
                  >
                    {completeMaintenanceMutation.isPending ? (
                      "Saving..."
                    ) : (
                      "Mark as Completed"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}