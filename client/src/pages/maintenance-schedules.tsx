import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  MaintenanceSchedule,
  InsertMaintenanceSchedule,
  MaintenanceFrequency,
  MaintenanceStatus,
  Asset,
  MaintenanceChangeLog,
} from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { insertMaintenanceScheduleSchema } from "@shared/schema";
import { 
  useMaintenanceSchedules,
  useCreateSchedule, 
  useUpdateSchedule, 
  useDeleteSchedule,
  useMaintenanceChangeLogs
} from "@/hooks/use-maintenance-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-US': enUS,
  },
});

// SidebarNav Component
function SidebarNav() {
  return (
    <div className="w-64 border-r h-screen p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Maintenance Manager</h2>
      </div>
      <nav className="space-y-2">
        <a href="/dashboard" className="block py-2 px-4 rounded hover:bg-accent">Dashboard</a>
        <a href="/assets" className="block py-2 px-4 rounded hover:bg-accent">Assets</a>
        <a href="/maintenance-schedules" className="block py-2 px-4 rounded bg-accent font-medium">Maintenance Schedules</a>
        <a href="/maintenance-calendar" className="block py-2 px-4 rounded hover:bg-accent">Maintenance Calendar</a>
        <a href="/work-orders" className="block py-2 px-4 rounded hover:bg-accent">Work Orders</a>
      </nav>
    </div>
  );
}

// Change log component
function ChangeLogList({ logs }: { logs: MaintenanceChangeLog[] }) {
  if (!logs.length) {
    return <p className="text-muted-foreground text-center my-4">No change history available</p>;
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4 p-4">
        {logs.map((log) => (
          <Card key={log.id} className="border-l-4 border-primary">
            <CardHeader className="py-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">
                  {log.changeType} - {log.fieldName || "All Fields"}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(log.changedAt), { addSuffix: true })}
                </span>
              </div>
              <CardDescription className="text-xs">
                {log.changedBy 
                  ? `Changed by User ID: ${log.changedBy}` 
                  : "System change"}
              </CardDescription>
            </CardHeader>
            <CardContent className="py-2">
              {log.changeType === "DELETE" ? (
                <div className="text-sm">
                  <p className="text-destructive font-medium">Record Deleted</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Previously: {log.oldValue ? JSON.parse(log.oldValue).title : "N/A"}
                  </p>
                </div>
              ) : log.changeType === "CREATE" ? (
                <div className="text-sm">
                  <p className="text-green-500 font-medium">New Record Created</p>
                  <div className="mt-2 text-xs">
                    <pre className="bg-muted p-2 rounded overflow-auto">
                      {log.newValue ? formatJSON(log.newValue) : "N/A"}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-medium">Previous value:</p>
                    <pre className="bg-muted p-2 rounded mt-1 overflow-auto">
                      {log.oldValue || "N/A"}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium">New value:</p>
                    <pre className="bg-muted p-2 rounded mt-1 overflow-auto">
                      {log.newValue || "N/A"}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

// Utility function to format JSON for display
function formatJSON(jsonString: string): string {
  try {
    const obj = JSON.parse(jsonString);
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return jsonString;
  }
}

export default function MaintenanceSchedules() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isChangeLogDialogOpen, setIsChangeLogDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const { toast } = useToast();

  // Data fetching
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });
  
  const { 
    schedulesQuery, 
    createScheduleMutation, 
    updateScheduleMutation, 
    deleteScheduleMutation 
  } = useMaintenanceSchedules();
  
  const schedules = schedulesQuery.data || [];
  
  // Fetch change logs for the selected schedule
  const changeLogsQuery = useMaintenanceChangeLogs(
    selectedSchedule?.id || 0, 
    { enabled: isChangeLogDialogOpen && !!selectedSchedule }
  );

  // This form is no longer used - we're using createForm and editForm instead

  // Create form for new schedules
  const createForm = useForm<InsertMaintenanceSchedule>({
    resolver: zodResolver(insertMaintenanceScheduleSchema),
    defaultValues: {
      title: "",
      description: "",
      frequency: MaintenanceFrequency.MONTHLY,
      status: MaintenanceStatus.SCHEDULED,
      startDate: new Date(),
      endDate: null,
      assetId: undefined,
    },
  });

  // Edit form for existing schedules
  const editForm = useForm<InsertMaintenanceSchedule>({
    resolver: zodResolver(insertMaintenanceScheduleSchema),
    defaultValues: {
      title: "",
      description: "",
      frequency: MaintenanceFrequency.MONTHLY,
      status: MaintenanceStatus.SCHEDULED,
      startDate: new Date(),
      endDate: null,
      assetId: undefined,
    },
  });

  // Handle dialog close for create dialog
  const handleCreateDialogChange = (open: boolean) => {
    if (!open) {
      createForm.reset();
    }
    setIsCreateDialogOpen(open);
  };

  // Handle dialog close for edit dialog
  const handleEditDialogChange = (open: boolean) => {
    if (!open) {
      editForm.reset();
      setSelectedSchedule(null);
    }
    setIsEditDialogOpen(open);
  };

  // Handle dialog close for change log dialog
  const handleChangeLogDialogChange = (open: boolean) => {
    if (!open) {
      setSelectedSchedule(null);
    }
    setIsChangeLogDialogOpen(open);
  };

  // Open edit dialog with selected schedule
  const openEditDialog = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    editForm.reset({
      title: schedule.title,
      description: schedule.description,
      frequency: schedule.frequency,
      status: schedule.status,
      startDate: new Date(schedule.startDate),
      endDate: schedule.endDate ? new Date(schedule.endDate) : null,
      assetId: schedule.assetId,
      affectsAssetStatus: schedule.affectsAssetStatus,
    });
    setIsEditDialogOpen(true);
  };

  // Open change log dialog for selected schedule
  const openChangeLogDialog = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setIsChangeLogDialogOpen(true);
  };

  // Handle calendar event selection
  const handleSelectEvent = (event: any) => {
    if (event.resource) {
      openEditDialog(event.resource);
    }
  };

  // Convert schedules to calendar events
  const events = schedules.map((schedule) => ({
    id: schedule.id,
    title: schedule.title,
    start: new Date(schedule.startDate),
    end: schedule.endDate ? new Date(schedule.endDate) : undefined,
    resource: schedule,
  }));

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="w-full overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Maintenance Schedules</h1>
              <p className="text-muted-foreground">
                Plan and track preventive maintenance
              </p>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogChange}>
              <DialogTrigger asChild>
                <Button>Schedule Maintenance</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule New Maintenance</DialogTitle>
                </DialogHeader>
                <Form {...createForm}>
                  <form
                    onSubmit={createForm.handleSubmit((data) => 
                      createScheduleMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={createForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="assetId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select asset" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {assets.map((asset) => (
                                <SelectItem
                                  key={asset.id}
                                  value={asset.id.toString()}
                                >
                                  {asset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequency</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(MaintenanceFrequency).map((freq) => (
                                <SelectItem key={freq} value={freq}>
                                  {freq}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                {...field}
                                value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ''}
                                onChange={(e) => field.onChange(new Date(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                {...field}
                                value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value ? new Date(value) : null);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={createForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(MaintenanceStatus).map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createScheduleMutation.isPending}
                    >
                      Schedule Maintenance
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Schedule Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Maintenance Schedule</DialogTitle>
                <DialogDescription>
                  Update maintenance schedule details. All changes will be logged.
                </DialogDescription>
              </DialogHeader>
              
              {selectedSchedule && (
                <Form {...editForm}>
                  <form
                    onSubmit={editForm.handleSubmit((data) => {
                      if (selectedSchedule) {
                        updateScheduleMutation.mutate({
                          id: selectedSchedule.id,
                          updates: data,
                        });
                        setIsEditDialogOpen(false);
                      }
                    })}
                    className="space-y-4"
                  >
                    <FormField
                      control={editForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="assetId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select asset" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {assets.map((asset) => (
                                <SelectItem
                                  key={asset.id}
                                  value={asset.id.toString()}
                                >
                                  {asset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="frequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frequency</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.values(MaintenanceFrequency).map((freq) => (
                                  <SelectItem key={freq} value={freq}>
                                    {freq}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.values(MaintenanceStatus).map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                {...field}
                                value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ''}
                                onChange={(e) => field.onChange(new Date(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                {...field}
                                value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value ? new Date(value) : null);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={editForm.control}
                      name="affectsAssetStatus"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Affects Asset Status</FormLabel>
                            <FormDescription>
                              When maintenance is due, change asset status to "Maintenance"
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <DialogFooter className="gap-2 sm:space-x-0">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => openChangeLogDialog(selectedSchedule)}
                      >
                        View Change History
                      </Button>
                      <Button
                        variant="destructive"
                        type="button"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this schedule?')) {
                            deleteScheduleMutation.mutate(selectedSchedule.id);
                            setIsEditDialogOpen(false);
                          }
                        }}
                      >
                        Delete
                      </Button>
                      <Button 
                        type="submit"
                        disabled={updateScheduleMutation.isPending}
                      >
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>

          {/* Change Log Dialog */}
          <Dialog open={isChangeLogDialogOpen} onOpenChange={handleChangeLogDialogChange}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Change History</DialogTitle>
                <DialogDescription>
                  {selectedSchedule ? `Change history for "${selectedSchedule.title}"` : "Select a schedule to view change history"}
                </DialogDescription>
              </DialogHeader>
              
              {changeLogsQuery.isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p>Loading change history...</p>
                </div>
              ) : (
                <ChangeLogList logs={changeLogsQuery.data || []} />
              )}
            </DialogContent>
          </Dialog>

          <div className="h-[600px] bg-card rounded-lg p-4">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              onSelectEvent={handleSelectEvent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}