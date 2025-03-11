import { useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays, addWeeks, addMonths } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { MaintenanceSchedule, Asset, MaintenanceFrequency, InsertMaintenanceCompletion, MaintenanceCompletion } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import { Trash2, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-US': enUS,
  },
});

const generateRecurringEvents = (schedule: MaintenanceSchedule, assetName: string, completions: MaintenanceCompletion[]) => {
  const events = [];
  const start = new Date(schedule.startDate);
  start.setHours(0, 0, 0, 0); // Set to start of day
  const end = schedule.endDate ? new Date(schedule.endDate) : addMonths(new Date(), 3);
  end.setHours(23, 59, 59, 999); // Set to end of day

  let currentDate = new Date(start);
  while (currentDate <= end) {
    const isCompleted = completions.some(
      completion =>
        completion.scheduleId === schedule.id &&
        format(new Date(completion.completedDate), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
    );

    if (!isCompleted) {
      const eventDate = new Date(currentDate);
      eventDate.setHours(0, 0, 0, 0); // Set to start of day

      events.push({
        id: `${schedule.id}-${eventDate.toISOString()}`,
        title: `${schedule.title} - ${assetName}`,
        start: eventDate,
        end: eventDate,
        resource: {
          ...schedule,
          assetName,
          date: eventDate,
        },
        allDay: true,
      });
    }

    switch (schedule.frequency) {
      case MaintenanceFrequency.DAILY:
        currentDate = addDays(currentDate, 1);
        break;
      case MaintenanceFrequency.WEEKLY:
        currentDate = addWeeks(currentDate, 1);
        break;
      case MaintenanceFrequency.MONTHLY:
        currentDate = addMonths(currentDate, 1);
        break;
      case MaintenanceFrequency.QUARTERLY:
        currentDate = addMonths(currentDate, 3);
        break;
      case MaintenanceFrequency.YEARLY:
        currentDate = addMonths(currentDate, 12);
        break;
      default:
        currentDate = end;
    }
  }

  return events;
};

const CustomAgenda = ({ event }: { event: any }) => (
  <div className="flex items-center gap-4 p-2 hover:bg-accent rounded-md">
    <div className="w-24 text-sm text-muted-foreground">
      {format(event.start, 'MMM dd, yyyy')}
    </div>
    <div>
      <div className="font-medium">{event.title}</div>
      <div className="text-sm text-muted-foreground">
        Frequency: {event.resource.frequency}
      </div>
    </div>
  </div>
);

export default function MaintenanceCalendar() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: schedules = [] } = useQuery<MaintenanceSchedule[]>({
    queryKey: ["/api/maintenance-schedules"],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: completions = [] } = useQuery<MaintenanceCompletion[]>({
    queryKey: ["/api/maintenance-completions"],
  });

  const completeMaintenanceMutation = useMutation({
    mutationFn: async (data: InsertMaintenanceCompletion) => {
      const res = await apiRequest("POST", "/api/maintenance-completions", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-completions"] });
      setIsCompleteDialogOpen(false);
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

  const deleteMaintenanceScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/maintenance-schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      setIsCompleteDialogOpen(false);
      toast({
        title: "Success",
        description: "Maintenance schedule removed",
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

  const form = useForm({
    defaultValues: {
      notes: "",
    },
  });

  const getAssetName = (assetId: number) => {
    const asset = assets.find(a => a.id === assetId);
    return asset ? asset.name : 'Unknown Asset';
  };

  const events = schedules.flatMap((schedule) =>
    generateRecurringEvents(schedule, getAssetName(schedule.assetId), completions)
  );

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true); // Changed to open details dialog
  };

  const showDetails = (event: any) => {
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  const getAssetDetails = (assetId: number) => {
    return assets.find(a => a.id === assetId);
  };

  const getCompletionHistory = (scheduleId: number) => {
    return completions
      .filter(c => c.scheduleId === scheduleId)
      .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());
  };

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Maintenance Calendar</h1>
            <p className="text-muted-foreground">
              View and manage scheduled maintenance
            </p>
          </div>

          <Card className="p-6">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "700px" }}
              views={{
                month: true,
                agenda: true,
              }}
              defaultView="month"
              tooltipAccessor={(event) =>
                `${event.title}\nFrequency: ${event.resource.frequency}`
              }
              className="[&_.rbc-month-view]:!rounded-lg [&_.rbc-month-view]:!border-border [&_.rbc-month-view]:!shadow-sm [&_.rbc-header]:!py-3 [&_.rbc-header]:!font-medium [&_.rbc-header]:!border-border [&_.rbc-month-row]:!border-border [&_.rbc-day-bg]:!border-border [&_.rbc-off-range-bg]:!bg-muted/50 [&_.rbc-today]:!bg-accent/20 [&_.rbc-event]:!px-2 [&_.rbc-event]:!py-1 [&_.rbc-event]:!rounded-md [&_.rbc-event]:!font-medium [&_.rbc-event]:!transition-colors [&_.rbc-event]:hover:!bg-primary/90 [&_.rbc-agenda-view]:!rounded-lg [&_.rbc-agenda-view]:!border-border [&_.rbc-agenda-view]:!shadow-sm [&_.rbc-agenda-view_table]:!border-border [&_.rbc-agenda-view_thead]:!border-border [&_.rbc-agenda-view_tbody]:!border-border [&_.rbc-agenda-view_tr]:!border-border [&_.rbc-agenda-view_td]:!border-border [&_.rbc-agenda-view_td]:!py-3 [&_.rbc-agenda-view_td]:!px-4 [&_.rbc-agenda-empty]:!text-muted-foreground [&_.rbc-agenda-date-cell]:!font-medium [&_.rbc-agenda-time-cell]:!text-muted-foreground [&_.rbc-button-link]:!text-sm [&_.rbc-toolbar-label]:!text-xl [&_.rbc-toolbar-label]:!font-semibold [&_.rbc-toolbar]:!mb-4 [&_.rbc-btn-group]:!gap-1 [&_.rbc-btn-group_button]:!rounded-md [&_.rbc-btn-group_button]:!px-3 [&_.rbc-btn-group_button]:!py-1.5 [&_.rbc-btn-group_button]:!text-sm [&_.rbc-btn-group_button]:!font-medium [&_.rbc-btn-group_button]:!bg-background [&_.rbc-btn-group_button]:!border-border [&_.rbc-btn-group_button]:!text-foreground [&_.rbc-btn-group_button.rbc-active]:!bg-primary [&_.rbc-btn-group_button.rbc-active]:!text-primary-foreground [&_.rbc-event]:!bg-primary/90 [&_.rbc-event]:!text-primary-foreground [&_.rbc-event]:hover:!bg-primary [&_.rbc-event]:!border-none [&_.rbc-today]:!bg-accent/10 [&_.rbc-off-range-bg]:!bg-muted/30 [&_.rbc-show-more]:!text-primary [&_.rbc-show-more]:hover:!text-primary/90"
              eventPropGetter={(event) => ({
                className: 'bg-primary hover:bg-primary/90 cursor-pointer',
                onClick: () => showDetails(event) // Added onClick handler
              })}
              onSelectEvent={handleSelectEvent}
              components={{
                agenda: {
                  event: CustomAgenda,
                },
              }}
              messages={{
                agenda: 'Daily List',
              }}
            />
          </Card>

          {/* Completion Dialog */}
          <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Maintenance Task</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsCompleteDialogOpen(false);
                      setIsDetailsDialogOpen(true);
                    }}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              {selectedEvent && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">{selectedEvent.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Date: {format(selectedEvent.start, 'PPP')}
                    </p>
                  </div>

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit((data) =>
                        completeMaintenanceMutation.mutate({
                          scheduleId: selectedEvent.resource.id,
                          completedDate: selectedEvent.resource.date.toISOString(),
                          notes: data.notes,
                        })
                      )}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Completion Notes</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Add any notes about the completed maintenance" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-between items-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" type="button" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Schedule
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Maintenance Schedule</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove all future occurrences of this maintenance schedule. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMaintenanceScheduleMutation.mutate(selectedEvent.resource.id)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button
                          type="submit"
                          disabled={completeMaintenanceMutation.isPending}
                        >
                          Mark as Completed
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Details Dialog */}
          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Maintenance Schedule Details</DialogTitle>
              </DialogHeader>
              {selectedEvent && (
                <div className="space-y-6">
                  {/* Schedule Information */}
                  <div className="space-y-2">
                    <h3 className="font-medium">Schedule Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Title</p>
                        <p>{selectedEvent.resource.title}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Frequency</p>
                        <p>{selectedEvent.resource.frequency}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p>{format(new Date(selectedEvent.resource.startDate), 'PPP')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">End Date</p>
                        <p>
                          {selectedEvent.resource.endDate
                            ? format(new Date(selectedEvent.resource.endDate), 'PPP')
                            : 'Ongoing'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Asset Information */}
                  {selectedEvent.resource.assetId && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Asset Information</h3>
                      {(() => {
                        const asset = getAssetDetails(selectedEvent.resource.assetId);
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

                  {/* Completion History */}
                  <div className="space-y-2">
                    <h3 className="font-medium">Completion History</h3>
                    <ScrollArea className="h-[200px] rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getCompletionHistory(selectedEvent.resource.id).map((completion) => (
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
        </div>
      </div>
    </div>
  );
}