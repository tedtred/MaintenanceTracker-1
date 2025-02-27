import { useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
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
} from "@/components/ui/dialog";
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

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-US': enUS,
  },
});

// Helper function to generate recurring events
const generateRecurringEvents = (schedule: MaintenanceSchedule, assetName: string, completions: MaintenanceCompletion[]) => {
  const events = [];
  const start = new Date(schedule.startDate);
  const end = schedule.endDate ? new Date(schedule.endDate) : addMonths(new Date(), 3);

  let currentDate = start;
  while (currentDate <= end) {
    // Check if this date is marked as completed
    const isCompleted = completions.some(
      completion => 
        completion.scheduleId === schedule.id &&
        format(new Date(completion.completedDate), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
    );

    // Only add non-completed dates
    if (!isCompleted) {
      events.push({
        id: `${schedule.id}-${currentDate.toISOString()}`,
        title: `${schedule.title} - ${assetName}`,
        start: new Date(currentDate),
        end: new Date(currentDate),
        resource: {
          ...schedule,
          assetName,
          date: new Date(currentDate),
        },
      });
    }

    // Calculate next occurrence based on frequency
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

export default function MaintenanceCalendar() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
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

  const form = useForm({
    defaultValues: {
      notes: "",
    },
  });

  const getAssetName = (assetId: number) => {
    const asset = assets.find(a => a.id === assetId);
    return asset ? asset.name : 'Unknown Asset';
  };

  // Generate all events including recurring ones, excluding completed ones
  const events = schedules.flatMap((schedule) => 
    generateRecurringEvents(schedule, getAssetName(schedule.assetId), completions)
  );

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setIsCompleteDialogOpen(true);
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
              views={['month', 'week', 'day']}
              defaultView="month"
              tooltipAccessor={(event) => 
                `${event.title}\nFrequency: ${event.resource.frequency}\nStatus: ${event.resource.status}`
              }
              eventPropGetter={(event) => ({
                className: 'bg-primary hover:bg-primary/90 cursor-pointer'
              })}
              onSelectEvent={handleSelectEvent}
            />
          </Card>

          {/* Complete Maintenance Dialog */}
          <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Complete Maintenance Task</DialogTitle>
              </DialogHeader>
              {selectedEvent && (
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
                    <div>
                      <h3 className="font-medium">{selectedEvent.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Date: {format(selectedEvent.start, 'PPP')}
                      </p>
                    </div>

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

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={completeMaintenanceMutation.isPending}
                    >
                      Mark as Completed
                    </Button>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}