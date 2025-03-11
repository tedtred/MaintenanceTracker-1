import { useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  MaintenanceSchedule,
  InsertMaintenanceSchedule,
  MaintenanceFrequency,
  MaintenanceStatus,
  Asset,
  InsertMaintenanceCompletion,
  MaintenanceCompletion
} from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Info, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-US': enUS,
  },
});

export default function MaintenanceCalendar() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
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
        description: "Maintenance task marked as completed",
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

  const handleMarkComplete = () => {
    setIsDetailsDialogOpen(false);
    setIsCompleteDialogOpen(true);
  };

  const handleSelectEvent = (event: any) => {
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

  const isTaskCompletedToday = (scheduleId: number, date: Date) => {
    return completions.some(
      completion =>
        completion.scheduleId === scheduleId &&
        format(new Date(completion.completedDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Maintenance Calendar</h1>
            <p className="text-muted-foreground">
              View and manage scheduled maintenance tasks
            </p>
          </div>

          <div className="bg-card rounded-lg p-4">
            <Calendar
              localizer={localizer}
              events={schedules.map(schedule => ({
                id: schedule.id,
                title: schedule.title,
                start: new Date(schedule.startDate),
                end: schedule.endDate ? new Date(schedule.endDate) : undefined,
                resource: schedule,
              }))}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "600px" }}
              onSelectEvent={handleSelectEvent}
            />
          </div>

          {/* Details Dialog */}
          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Maintenance Schedule Details</DialogTitle>
              </DialogHeader>
              {selectedEvent && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedEvent.resource.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        Frequency: {selectedEvent.resource.frequency}
                      </p>
                    </div>
                    <Button
                      onClick={handleMarkComplete}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Complete
                    </Button>
                  </div>

                  {/* Schedule Information */}
                  <div className="space-y-2">
                    <h3 className="font-medium">Schedule Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
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
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge>{selectedEvent.resource.status}</Badge>
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
                              <Badge variant={
                                asset.status === 'OPERATIONAL' ? 'default' :
                                asset.status === 'MAINTENANCE' ? 'warning' :
                                'destructive'
                              }>{asset.status}</Badge>
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

          {/* Complete Task Dialog */}
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
                        completedDate: new Date().toISOString(),
                        notes: data.notes,
                      })
                    )}
                    className="space-y-4"
                  >
                    <div>
                      <h3 className="font-medium">{selectedEvent.resource.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Asset: {getAssetDetails(selectedEvent.resource.assetId)?.name}
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Completion Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Add any notes about the completed maintenance"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCompleteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={completeMaintenanceMutation.isPending}
                      >
                        {completeMaintenanceMutation.isPending ? (
                          "Saving..."
                        ) : (
                          "Mark as Complete"
                        )}
                      </Button>
                    </div>
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