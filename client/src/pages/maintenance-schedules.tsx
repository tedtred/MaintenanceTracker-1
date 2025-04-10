import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, formatDistanceToNow } from "date-fns";
import enUS from "date-fns/locale/en-US";
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

  const form = useForm<InsertMaintenanceSchedule>({
    resolver: zodResolver(insertMaintenanceScheduleSchema),
    defaultValues: {
      title: "",
      description: "",
      frequency: MaintenanceFrequency.MONTHLY,
      status: MaintenanceStatus.SCHEDULED,
      startDate: new Date(),
      endDate: null,
      assetId: undefined, // This will force user to select an asset
    },
  });

  // Handle dialog close
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      form.reset(); // Reset form when dialog closes
    }
    setIsCreateDialogOpen(open);
  };

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
      <div className="w-full">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Maintenance Schedules</h1>
              <p className="text-muted-foreground">
                Plan and track preventive maintenance
              </p>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button>Schedule Maintenance</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule New Maintenance</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) =>
                      createMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                      control={form.control}
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
                      control={form.control}
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
                        control={form.control}
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
                        control={form.control}
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
                      control={form.control}
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
                      disabled={createMutation.isPending}
                    >
                      Schedule Maintenance
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="h-[600px] bg-card rounded-lg p-4">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}