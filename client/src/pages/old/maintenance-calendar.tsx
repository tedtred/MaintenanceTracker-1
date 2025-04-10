import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays, addWeeks, addMonths, isFuture, isPast, isToday, differenceInDays } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  MaintenanceSchedule,
  Asset,
  MaintenanceFrequency,
  InsertMaintenanceCompletion,
  MaintenanceCompletion,
  Settings,
  AssetStatus,
  MaintenanceStatus,
} from "@shared/schema";
import { Card } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
import { Trash2, Info, CheckCircle2, CalendarDays, ListTodo, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-US': enUS,
  },
});

const generateRecurringEvents = (schedule: MaintenanceSchedule, assetName: string, completions: MaintenanceCompletion[] | undefined) => {
  const events = [];
  const start = new Date(schedule.startDate);
  start.setHours(0, 0, 0, 0);
  const end = schedule.endDate ? new Date(schedule.endDate) : addMonths(new Date(), 3);
  end.setHours(23, 59, 59, 999);

  let currentDate = new Date(start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (currentDate <= end) {
    const isCompleted = Array.isArray(completions) && completions.some(
      completion =>
        completion.scheduleId === schedule.id &&
        format(new Date(completion.completedDate), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
    );

    // Include all non-completed events
    if (!isCompleted) {
      const eventDate = isPast(currentDate) ? new Date(today) : new Date(currentDate);
      eventDate.setHours(0, 0, 0, 0);

      const daysOverdue = differenceInDays(today, currentDate);
      const status = daysOverdue > 0 ? `Overdue by ${daysOverdue} days` : 'Due today';

      events.push({
        id: `${schedule.id}-${currentDate.toISOString()}`,
        title: `${schedule.title} - ${assetName}`,
        start: eventDate, // Show on today's date
        end: eventDate,
        resource: {
          ...schedule,
          assetName,
          originalDate: currentDate, // Keep track of original date
          date: eventDate,
          status,
          isOverdue: daysOverdue > 0,
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

// Component for custom agenda event rendering
const CustomAgenda = ({ event, onSelectEvent }: { event: any; onSelectEvent?: (event: any) => void }) => (
  <div 
    onClick={() => onSelectEvent && onSelectEvent(event)}
    className={`flex items-center justify-between p-1.5 hover:bg-accent rounded-md cursor-pointer transition-colors ${event.resource.isOverdue ? 'bg-destructive/10' : ''}`}
  >
    <div className="flex items-center gap-2 overflow-hidden flex-1">
      <div className={`w-1 h-10 rounded-full ${event.resource.isOverdue ? 'bg-destructive' : 'bg-primary'}`}></div>
      <div className="overflow-hidden">
        <div className="font-medium truncate">{event.title}</div>
        <div className="text-xs text-muted-foreground truncate">
          {event.resource.assetName}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        {format(event.start, 'MMM dd')}
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6" 
        onClick={(e) => {
          e.stopPropagation();
          onSelectEvent && onSelectEvent(event);
        }}
      >
        <Info className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);

export default function MaintenanceCalendar() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [currentView, setCurrentView] = useState<string>("month");
  const [unifiedView, setUnifiedView] = useState<boolean>(false);
  const [selectedAsset, setSelectedAsset] = useState<string>("all");
  const [selectedFrequency, setSelectedFrequency] = useState<string>("all");
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const schedulesQuery = useQuery<MaintenanceSchedule[]>({
    queryKey: ["/api/maintenance-schedules"],
    async queryFn() {
      const res = await apiRequest("GET", "/api/maintenance-schedules");
      return await res.json() as MaintenanceSchedule[];
    },
  });

  const assetsQuery = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
    async queryFn() {
      const res = await apiRequest("GET", "/api/assets");
      return await res.json() as Asset[];
    },
  });

  const completionsQuery = useQuery<MaintenanceCompletion[]>({
    queryKey: ["/api/maintenance-completions"],
    async queryFn() {
      const res = await apiRequest("GET", "/api/maintenance-completions");
      return await res.json() as MaintenanceCompletion[];
    },
  });
  
  const settingsQuery = useQuery<Settings>({
    queryKey: ['/api/settings'],
    async queryFn() {
      const res = await apiRequest("GET", "/api/settings");
      return await res.json() as Settings;
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
  
  // Mutation for updating asset status
  const updateAssetStatusMutation = useMutation({
    mutationFn: async ({ assetId, status }: { assetId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/assets/${assetId}`, {
        status
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Asset status updated successfully",
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
  
  // Mutation for updating maintenance schedule
  const updateMaintenanceScheduleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<MaintenanceSchedule> }) => {
      const res = await apiRequest("PATCH", `/api/maintenance-schedules/${id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      toast({
        title: "Success",
        description: "Maintenance schedule updated successfully",
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
    const asset = Array.isArray(assetsQuery.data) ? assetsQuery.data.find(a => a.id === assetId) : undefined;
    return asset ? asset.name : 'Unknown Asset';
  };

  // Filter schedules based on selected asset and frequency
  const filteredSchedules = Array.isArray(schedulesQuery.data) ? schedulesQuery.data.filter(schedule => {
    // Filter by asset
    if (selectedAsset !== 'all' && schedule.assetId.toString() !== selectedAsset) {
      return false;
    }
    
    // Filter by frequency
    if (selectedFrequency !== 'all' && schedule.frequency !== selectedFrequency) {
      return false;
    }
    
    return true;
  }) : [];

  const events = filteredSchedules.flatMap((schedule) =>
    generateRecurringEvents(schedule, getAssetName(schedule.assetId), completionsQuery.data)
  );

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  const showDetails = (event: any) => {
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  const getAssetDetails = (assetId: number) => {
    return Array.isArray(assetsQuery.data) ? assetsQuery.data.find(a => a.id === assetId) : undefined;
  };

  const getCompletionHistory = (scheduleId: number) => {
    return Array.isArray(completionsQuery.data) 
      ? completionsQuery.data
        .filter(c => c.scheduleId === scheduleId)
        .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime())
      : [];
  };

  const handleCompleteClick = () => {
    setIsDetailsDialogOpen(false);
    setIsCompleteDialogOpen(true);
  };

  // Using the week start day from settings if available
  useEffect(() => {
    if (settingsQuery.data) {
      // Update the localizer with the user's preferred start of week
      const weekStartsOn = settingsQuery.data.workWeekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      // For react-big-calendar, we need to return a function that returns the first day of week
      localizer.startOfWeek = () => {
        const sdow = startOfWeek(new Date(), { weekStartsOn });
        return sdow.getDay() as any;
      };
    }
  }, [settingsQuery.data]);

  // Format dates according to user's preference
  const formatDate = (date: Date) => {
    if (!settingsQuery.data) return format(date, 'MMM dd, yyyy');
    
    try {
      // Convert settings.dateFormat to a format string that date-fns understands
      const formatStr = settingsQuery.data.dateFormat
        .replace('MM', 'MM')
        .replace('DD', 'dd')
        .replace('YYYY', 'yyyy');
      
      return format(date, formatStr);
    } catch (error) {
      return format(date, 'MMM dd, yyyy'); // fallback
    }
  };

  // Customize messages based on the current view
  const customMessages = {
    month: 'Monthly Schedule',
    week: 'Weekly Schedule',
    day: 'Daily Schedule',
    agenda: 'Upcoming Tasks',
  };

  // Define available views
  const calendarViews = {
    month: true,
    week: true,
    day: true,
    agenda: true
  };

  // Check if data is loading
  if (
    schedulesQuery.isLoading ||
    assetsQuery.isLoading ||
    completionsQuery.isLoading ||
    settingsQuery.isLoading
  ) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen">
      <div className="w-full">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Maintenance Calendar</h1>
            <p className="text-muted-foreground">
              View and manage scheduled maintenance
            </p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <Tabs 
              value={unifiedView ? "unified" : "split"} 
              onValueChange={(val) => setUnifiedView(val === "unified")}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="unified" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Unified View</span>
                </TabsTrigger>
                <TabsTrigger value="split" className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4" />
                  <span>Split View</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {unifiedView && (
              <Tabs 
                value={currentView} 
                onValueChange={setCurrentView}
                className="ml-4"
              >
                <TabsList>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="agenda">List</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          {unifiedView ? (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Select
                      value={selectedAsset}
                      onValueChange={setSelectedAsset}
                    >
                      <SelectTrigger className="w-[180px]">
                        <span>{selectedAsset === 'all' ? 'All Assets' : getAssetName(parseInt(selectedAsset))}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assets</SelectItem>
                        {Array.isArray(assetsQuery.data) ? assetsQuery.data.map(asset => (
                          <SelectItem key={asset.id} value={asset.id.toString()}>{asset.name}</SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedFrequency}
                      onValueChange={setSelectedFrequency}
                    >
                      <SelectTrigger className="w-[180px]">
                        <span>
                          {selectedFrequency === 'all' 
                            ? 'All Frequencies' 
                            : selectedFrequency === 'DAILY' ? 'Daily'
                            : selectedFrequency === 'WEEKLY' ? 'Weekly'
                            : selectedFrequency === 'MONTHLY' ? 'Monthly'
                            : selectedFrequency === 'QUARTERLY' ? 'Quarterly'
                            : selectedFrequency === 'SEMI_ANNUALLY' ? 'Semi-Annually'
                            : 'Annually'
                          }
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Frequencies</SelectItem>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                        <SelectItem value="SEMI_ANNUALLY">Semi-Annually</SelectItem>
                        <SelectItem value="YEARLY">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 600 }}
                  onSelectEvent={handleSelectEvent}
                  messages={customMessages}
                  view={currentView as any}
                  onView={(view) => setCurrentView(view)}
                  views={calendarViews}
                  eventPropGetter={(event) => ({
                    style: {
                      backgroundColor: event.resource.isOverdue ? '#f87171' : '#3b82f6',
                      borderRadius: '4px',
                    },
                  })}
                />
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 col-span-2">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold mb-4">Monthly Overview</h2>
                  <div className="flex gap-2">
                    <Select
                      value={selectedAsset}
                      onValueChange={setSelectedAsset}
                    >
                      <SelectTrigger className="w-[130px]">
                        <span className="truncate">{selectedAsset === 'all' ? 'All Assets' : getAssetName(parseInt(selectedAsset))}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assets</SelectItem>
                        {Array.isArray(assetsQuery.data) ? assetsQuery.data.map(asset => (
                          <SelectItem key={asset.id} value={asset.id.toString()}>{asset.name}</SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 400 }}
                  onSelectEvent={handleSelectEvent}
                  defaultView="month"
                  views={['month']}
                  toolbar={false}
                  eventPropGetter={(event) => ({
                    style: {
                      backgroundColor: event.resource.isOverdue ? '#f87171' : '#3b82f6',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                    },
                  })}
                />
              </Card>
              <Card className="p-6 col-span-1">
                <h2 className="text-lg font-semibold mb-4">Attention Required</h2>
                <div className="space-y-2">
                  <Select
                    value={selectedFrequency}
                    onValueChange={setSelectedFrequency}
                  >
                    <SelectTrigger className="w-full mb-4">
                      <span>
                        {selectedFrequency === 'all' 
                          ? 'All Frequencies' 
                          : selectedFrequency === 'DAILY' ? 'Daily'
                          : selectedFrequency === 'WEEKLY' ? 'Weekly'
                          : selectedFrequency === 'MONTHLY' ? 'Monthly'
                          : selectedFrequency === 'QUARTERLY' ? 'Quarterly'
                          : selectedFrequency === 'SEMI_ANNUALLY' ? 'Semi-Annually'
                          : 'Annually'
                        }
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Frequencies</SelectItem>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="SEMI_ANNUALLY">Semi-Annually</SelectItem>
                      <SelectItem value="YEARLY">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {events
                        .filter(event => event.resource.isOverdue)
                        .sort((a, b) => 
                          differenceInDays(a.start, a.resource.originalDate) - 
                          differenceInDays(b.start, b.resource.originalDate)
                        )
                        .map(event => (
                          <CustomAgenda 
                            key={event.id} 
                            event={event} 
                            onSelectEvent={showDetails}
                          />
                        ))}
                      
                      {events
                        .filter(event => !event.resource.isOverdue && isToday(event.start))
                        .map(event => (
                          <CustomAgenda 
                            key={event.id} 
                            event={event} 
                            onSelectEvent={showDetails}
                          />
                        ))}
                      
                      {events
                        .filter(event => !event.resource.isOverdue && isFuture(event.start))
                        .slice(0, 5)
                        .map(event => (
                          <CustomAgenda 
                            key={event.id} 
                            event={event} 
                            onSelectEvent={showDetails}
                          />
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </Card>
            </div>
          )}

          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Maintenance Details</DialogTitle>
              </DialogHeader>
              {selectedEvent && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">{selectedEvent.title}</h2>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCompleteClick}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Complete
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this maintenance schedule?")) {
                              deleteMaintenanceScheduleMutation.mutate(selectedEvent.resource.id);
                              setIsDetailsDialogOpen(false);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Scheduled Date</p>
                        <p>{formatDate(selectedEvent.resource.originalDate)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className={selectedEvent.resource.isOverdue ? "text-destructive" : ""}>
                          {selectedEvent.resource.isOverdue 
                            ? selectedEvent.resource.status 
                            : selectedEvent.resource.status === MaintenanceStatus.WAITING_ON_PARTS
                            ? 'Waiting on parts'
                            : selectedEvent.resource.status === MaintenanceStatus.IN_PROGRESS
                            ? 'In progress'
                            : 'Ongoing'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Description</p>
                        <p className="whitespace-pre-wrap">{selectedEvent.resource.description}</p>
                      </div>
                    </div>
                  </div>

                  {selectedEvent.resource.assetId && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Asset Information</h3>
                        
                        {/* Add asset status selector */}
                        {(() => {
                          const asset = getAssetDetails(selectedEvent.resource.assetId);
                          if (!asset) return null;
                          
                          return (
                            <Select
                              value={asset.status}
                              onValueChange={(status) => 
                                updateAssetStatusMutation.mutate({ 
                                  assetId: selectedEvent.resource.assetId, 
                                  status 
                                })
                              }
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Update Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OPERATIONAL">OPERATIONAL</SelectItem>
                                <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                                <SelectItem value="OFFLINE">OFFLINE</SelectItem>
                                <SelectItem value="DECOMMISSIONED">DECOMMISSIONED</SelectItem>
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </div>
                      
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
                              <p className="font-medium">{asset.status}</p>
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

          <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Complete Maintenance Task</DialogTitle>
              </DialogHeader>
              {selectedEvent && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-medium">{selectedEvent.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(selectedEvent.start, 'PPP')}
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
                              <Textarea
                                {...field}
                                placeholder="Enter any notes about the completed maintenance"
                                className="min-h-[100px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Parts Required toggle */}
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h4 className="font-medium mb-1">Waiting for Parts</h4>
                            <p className="text-sm text-muted-foreground">
                              Enable this if maintenance is incomplete due to waiting for parts
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={selectedEvent.resource.status === "WAITING_ON_PARTS"}
                              onCheckedChange={(checked) => {
                                // Set the maintenance schedule status to WAITING_ON_PARTS or IN_PROGRESS
                                updateMaintenanceScheduleMutation.mutate({
                                  id: selectedEvent.resource.id,
                                  updates: { 
                                    status: checked ? "WAITING_ON_PARTS" : "IN_PROGRESS"
                                  }
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsCompleteDialogOpen(false);
                            setIsDetailsDialogOpen(true);
                          }}
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
                            "Complete Maintenance"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}