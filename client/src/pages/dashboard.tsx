import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { z } from "zod";
import { format, isToday, parseISO, differenceInDays } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  WorkOrderStatus,
  WorkOrderPriority,
  MaintenanceStatus,
  MaintenanceFrequency,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("today");
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // Fetch work orders
  const workOrdersQuery = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => apiRequest("GET", "/api/work-orders"),
  });

  // Fetch maintenance schedules
  const maintenanceSchedulesQuery = useQuery({
    queryKey: ["/api/maintenance-schedules"],
    queryFn: () => apiRequest("GET", "/api/maintenance-schedules"),
  });

  // Fetch assets
  const assetsQuery = useQuery({
    queryKey: ["/api/assets"],
    queryFn: () => apiRequest("GET", "/api/assets"),
  });

  // Fetch maintenance completions
  const maintenanceCompletionsQuery = useQuery({
    queryKey: ["/api/maintenance-completions"],
    queryFn: () => apiRequest("GET", "/api/maintenance-completions"),
  });

  // Mutation for completing maintenance
  const completeMaintenanceMutation = useMutation({
    mutationFn: (data) => apiRequest("POST", "/api/maintenance-completions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-completions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      setIsCompleteDialogOpen(false);
      setIsDetailsDialogOpen(false);
      toast({
        title: "Success",
        description: "Maintenance task marked as completed",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
  const openDetailsDialog = (task) => {
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
    if (!assetsQuery.data || !Array.isArray(assetsQuery.data)) return null;
    return assetsQuery.data.find((asset) => asset.id === assetId);
  };

  // Get asset name by ID (for display)
  const getAssetName = (assetId: number) => {
    const asset = getAssetDetails(assetId);
    return asset ? asset.name : "Unknown Asset";
  };

  // Get completion history for a schedule
  const getCompletionHistory = (scheduleId: number) => {
    if (!maintenanceCompletionsQuery.data || !Array.isArray(maintenanceCompletionsQuery.data)) return [];
    return maintenanceCompletionsQuery.data
      .filter((completion) => completion.scheduleId === scheduleId)
      .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());
  };

  // Check if data is loading
  if (
    workOrdersQuery.isLoading ||
    maintenanceSchedulesQuery.isLoading ||
    assetsQuery.isLoading ||
    maintenanceCompletionsQuery.isLoading
  ) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Process work orders
  const workOrders = workOrdersQuery.data || [];
  const activeWorkOrders = Array.isArray(workOrders) ? workOrders.filter(
    (wo) => wo.status !== WorkOrderStatus.ARCHIVED
  ) : [];
  const openWorkOrders = Array.isArray(workOrders) ? workOrders.filter(
    (wo) => wo.status === WorkOrderStatus.OPEN
  ).length : 0;
  const inProgressWorkOrders = Array.isArray(workOrders) ? workOrders.filter(
    (wo) => wo.status === WorkOrderStatus.IN_PROGRESS
  ).length : 0;

  // Process maintenance schedules
  const schedules = maintenanceSchedulesQuery.data || [];
  
  // Create task objects with additional calculated properties
  const maintenanceTasks = Array.isArray(schedules) 
    ? schedules
        .filter(schedule => schedule.status === MaintenanceStatus.ACTIVE)
        .map(schedule => {
          const lastCompleted = getCompletionHistory(schedule.id)[0];
          
          // Calculate the next due date based on frequency and last completion
          let dueDate = new Date(schedule.startDate);
          if (lastCompleted) {
            dueDate = new Date(lastCompleted.completedDate);
            
            switch (schedule.frequency) {
              case MaintenanceFrequency.DAILY:
                dueDate.setDate(dueDate.getDate() + 1);
                break;
              case MaintenanceFrequency.WEEKLY:
                dueDate.setDate(dueDate.getDate() + 7);
                break;
              case MaintenanceFrequency.BIWEEKLY:
                dueDate.setDate(dueDate.getDate() + 14);
                break;
              case MaintenanceFrequency.MONTHLY:
                dueDate.setMonth(dueDate.getMonth() + 1);
                break;
              case MaintenanceFrequency.QUARTERLY:
                dueDate.setMonth(dueDate.getMonth() + 3);
                break;
              case MaintenanceFrequency.SEMIANNUALLY:
                dueDate.setMonth(dueDate.getMonth() + 6);
                break;
              case MaintenanceFrequency.ANNUALLY:
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
        .sort((a, b) => a.date - b.date)
    : [];
  
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
  
  const overdueTasks = maintenanceTasks.filter(task => task.isOverdue);
  const todayTasks = maintenanceTasks.filter(task => isToday(task.date));

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
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[360px] pr-4">
                  <div className="space-y-3">
                    {activeWorkOrders.length > 0 ? (
                      activeWorkOrders.slice(0, 10).map((wo) => (
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
    </>
  );
}
