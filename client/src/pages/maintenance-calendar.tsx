import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
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
import { Trash2, Info, CheckCircle2, CalendarDays, ListTodo, Calendar as CalendarIcon } from "lucide-react";
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

const generateRecurringEvents = (schedule: MaintenanceSchedule, assetName: string, completions: MaintenanceCompletion[]) => {
  const events = [];
  const start = new Date(schedule.startDate);
  start.setHours(0, 0, 0, 0);
  const end = schedule.endDate ? new Date(schedule.endDate) : addMonths(new Date(), 3);
  end.setHours(23, 59, 59, 999);

  let currentDate = new Date(start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (currentDate <= end) {
    const isCompleted = completions.some(
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

  const { data: schedules = [] } = useQuery<MaintenanceSchedule[]>({
    queryKey: ["/api/maintenance-schedules"],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: completions = [] } = useQuery<MaintenanceCompletion[]>({
    queryKey: ["/api/maintenance-completions"],
  });
  
  const { data: settings } = useQuery<Settings>({
    queryKey: ['/api/settings'],
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

  const form = useForm({
    defaultValues: {
      notes: "",
    },
  });

  const getAssetName = (assetId: number) => {
    const asset = assets.find(a => a.id === assetId);
    return asset ? asset.name : 'Unknown Asset';
  };

  // Filter schedules based on selected asset and frequency
  const filteredSchedules = schedules.filter(schedule => {
    // Filter by asset
    if (selectedAsset !== 'all' && schedule.assetId.toString() !== selectedAsset) {
      return false;
    }
    
    // Filter by frequency
    if (selectedFrequency !== 'all' && schedule.frequency !== selectedFrequency) {
      return false;
    }
    
    return true;
  });

  const events = filteredSchedules.flatMap((schedule) =>
    generateRecurringEvents(schedule, getAssetName(schedule.assetId), completions)
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
    return assets.find(a => a.id === assetId);
  };

  const getCompletionHistory = (scheduleId: number) => {
    return completions
      .filter(c => c.scheduleId === scheduleId)
      .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());
  };

  const handleCompleteClick = () => {
    setIsDetailsDialogOpen(false);
    setIsCompleteDialogOpen(true);
  };

  // Using the week start day from settings if available
  useEffect(() => {
    if (settings) {
      // Update the localizer with the user's preferred start of week
      const weekStartsOn = settings.workWeekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      // For react-big-calendar, we need to return a function that returns the first day of week
      localizer.startOfWeek = () => {
        const sdow = startOfWeek(new Date(), { weekStartsOn });
        return sdow.getDay() as any;
      };
    }
  }, [settings]);

  // Format dates according to user's preference
  const formatDate = (date: Date) => {
    if (!settings) return format(date, 'MMM dd, yyyy');
    
    try {
      // Convert settings.dateFormat to a format string that date-fns understands
      const formatStr = settings.dateFormat
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
  
  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8 overflow-y-auto">
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
                        {assets.map(asset => (
                          <SelectItem key={asset.id} value={asset.id.toString()}>{asset.name}</SelectItem>
                        ))}
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
                        <SelectItem value="ANNUALLY">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <span>Upcoming</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-destructive"></div>
                      <span>Overdue</span>
                    </div>
                  </div>
                </div>
                
                <Calendar
                  localizer={localizer}
                  events={events.map(event => ({
                    ...event,
                    start: event.resource.originalDate || event.start,
                    end: event.resource.originalDate || event.end,
                    title: `${event.title.length > 20 ? event.title.substring(0, 20) + '...' : event.title}`
                  }))}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: "650px" }}
                  views={calendarViews}
                  view={currentView as any}
                  onView={(view) => setCurrentView(view)}
                  tooltipAccessor={(event) =>
                    `${event.resource.title}\nAsset: ${event.resource.assetName}\nFrequency: ${event.resource.frequency}${event.resource.isOverdue ? '\nStatus: OVERDUE' : ''}`
                  }
                  className="[&_.rbc-month-view]:!rounded-lg [&_.rbc-month-view]:!border-border [&_.rbc-month-view]:!shadow-sm [&_.rbc-header]:!py-3 [&_.rbc-header]:!font-medium [&_.rbc-header]:!border-border [&_.rbc-month-row]:!border-border [&_.rbc-day-bg]:!border-border [&_.rbc-off-range-bg]:!bg-muted/50 [&_.rbc-today]:!bg-accent/20 [&_.rbc-event]:!px-2 [&_.rbc-event]:!py-1 [&_.rbc-event]:!rounded-md [&_.rbc-event]:!font-medium [&_.rbc-event]:!transition-colors [&_.rbc-event]:hover:!bg-primary/90 [&_.rbc-agenda-view]:!rounded-lg [&_.rbc-agenda-view]:!border-border [&_.rbc-agenda-view]:!shadow-sm [&_.rbc-agenda-view_table]:!border-border [&_.rbc-agenda-view_thead]:!border-border [&_.rbc-agenda-view_tbody]:!border-border [&_.rbc-agenda-view_tr]:!border-border [&_.rbc-agenda-view_td]:!border-border [&_.rbc-agenda-view_td]:!py-3 [&_.rbc-agenda-view_td]:!px-4 [&_.rbc-agenda-empty]:!text-muted-foreground [&_.rbc-agenda-date-cell]:!font-medium [&_.rbc-agenda-time-cell]:!text-muted-foreground [&_.rbc-button-link]:!text-sm [&_.rbc-toolbar-label]:!text-xl [&_.rbc-toolbar-label]:!font-semibold [&_.rbc-toolbar]:!mb-4 [&_.rbc-btn-group]:!gap-1 [&_.rbc-btn-group_button]:!rounded-md [&_.rbc-btn-group_button]:!px-3 [&_.rbc-btn-group_button]:!py-1.5 [&_.rbc-btn-group_button]:!text-sm [&_.rbc-btn-group_button]:!font-medium [&_.rbc-btn-group_button]:!bg-background [&_.rbc-btn-group_button]:!border-border [&_.rbc-btn-group_button]:!text-foreground [&_.rbc-btn-group_button.rbc-active]:!bg-primary [&_.rbc-btn-group_button.rbc-active]:!text-primary-foreground [&_.rbc-event]:!text-primary-foreground [&_.rbc-event]:hover:!bg-primary [&_.rbc-event]:!border-none [&_.rbc-today]:!bg-accent/10 [&_.rbc-off-range-bg]:!bg-muted/30 [&_.rbc-show-more]:!text-primary [&_.rbc-show-more]:hover:!text-primary/90 [&_.rbc-day-slot]:!border-border [&_.rbc-time-slot]:!border-border [&_.rbc-time-header]:!border-border [&_.rbc-time-content]:!border-border [&_.rbc-time-gutter]:!text-muted-foreground [&_.rbc-time-view]:!border-border [&_.rbc-time-view]:!rounded-lg [&_.rbc-now-indicator]:!border-destructive"
                  eventPropGetter={(event) => ({
                    className: `${event.resource.isOverdue ? 'bg-destructive/90 hover:bg-destructive' : 'bg-primary/90 hover:bg-primary'} cursor-pointer`,
                    style: {
                      border: event.resource.isOverdue ? '1px solid rgba(var(--destructive-rgb), 0.8)' : 'none',
                    }
                  })}
                  onSelectEvent={handleSelectEvent}
                  components={{
                    agenda: {
                      event: (props: any) => <CustomAgenda {...props} onSelectEvent={handleSelectEvent} />,
                    },
                    event: (props: any) => (
                      <div 
                        className="h-full w-full flex items-center" 
                        onClick={() => props.onClick && props.onClick()}
                      >
                        <div className="truncate text-xs text-primary-foreground">{props.title}</div>
                      </div>
                    ),
                  }}
                  messages={customMessages}
                  formats={{
                    dateFormat: (date) => formatDate(date),
                    dayFormat: (date) => format(date, 'EEE dd'),
                    timeGutterFormat: (date) => settings?.timeFormat === 'HH:mm' 
                      ? format(date, 'HH:mm') 
                      : format(date, 'h:mm a'),
                  }}
                />
              </div>
            </Card>
          ) : (
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}>
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Monthly View</h2>
                    
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span>Upcoming</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-destructive"></div>
                        <span>Overdue</span>
                      </div>
                    </div>
                  </div>
                
                  <Calendar
                    localizer={localizer}
                    events={events.map(event => ({
                      ...event,
                      start: event.resource.originalDate || event.start,
                      end: event.resource.originalDate || event.end,
                      title: `${event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title}`
                    }))}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: "560px" }}
                    views={{ month: true }}
                    defaultView="month"
                    tooltipAccessor={(event) =>
                      `${event.resource.title}\nAsset: ${event.resource.assetName}\nFrequency: ${event.resource.frequency}${event.resource.isOverdue ? '\nStatus: OVERDUE' : ''}`
                    }
                    className="[&_.rbc-month-view]:!rounded-lg [&_.rbc-month-view]:!border-border [&_.rbc-month-view]:!shadow-sm [&_.rbc-header]:!py-3 [&_.rbc-header]:!font-medium [&_.rbc-header]:!border-border [&_.rbc-month-row]:!border-border [&_.rbc-day-bg]:!border-border [&_.rbc-off-range-bg]:!bg-muted/50 [&_.rbc-today]:!bg-accent/20 [&_.rbc-event]:!px-2 [&_.rbc-event]:!py-1 [&_.rbc-event]:!rounded-md [&_.rbc-event]:!font-medium [&_.rbc-event]:!transition-colors [&_.rbc-event]:hover:!bg-primary/90 [&_.rbc-agenda-view]:!rounded-lg [&_.rbc-agenda-view]:!border-border [&_.rbc-agenda-view]:!shadow-sm [&_.rbc-agenda-view_table]:!border-border [&_.rbc-agenda-view_thead]:!border-border [&_.rbc-agenda-view_tbody]:!border-border [&_.rbc-agenda-view_tr]:!border-border [&_.rbc-agenda-view_td]:!border-border [&_.rbc-agenda-view_td]:!py-3 [&_.rbc-agenda-view_td]:!px-4 [&_.rbc-agenda-empty]:!text-muted-foreground [&_.rbc-agenda-date-cell]:!font-medium [&_.rbc-agenda-time-cell]:!text-muted-foreground [&_.rbc-button-link]:!text-sm [&_.rbc-toolbar-label]:!text-xl [&_.rbc-toolbar-label]:!font-semibold [&_.rbc-toolbar]:!mb-4 [&_.rbc-btn-group]:!gap-1 [&_.rbc-btn-group_button]:!rounded-md [&_.rbc-btn-group_button]:!px-3 [&_.rbc-btn-group_button]:!py-1.5 [&_.rbc-btn-group_button]:!text-sm [&_.rbc-btn-group_button]:!font-medium [&_.rbc-btn-group_button]:!bg-background [&_.rbc-btn-group_button]:!border-border [&_.rbc-btn-group_button]:!text-foreground [&_.rbc-btn-group_button.rbc-active]:!bg-primary [&_.rbc-btn-group_button.rbc-active]:!text-primary-foreground [&_.rbc-event]:!text-primary-foreground [&_.rbc-event]:hover:!bg-primary [&_.rbc-event]:!border-none [&_.rbc-today]:!bg-accent/10 [&_.rbc-off-range-bg]:!bg-muted/30 [&_.rbc-show-more]:!text-primary [&_.rbc-show-more]:hover:!text-primary/90"
                    eventPropGetter={(event) => ({
                      className: `${event.resource.isOverdue ? 'bg-destructive/90 hover:bg-destructive' : 'bg-primary/90 hover:bg-primary'} cursor-pointer`,
                      style: {
                        border: event.resource.isOverdue ? '1px solid rgba(var(--destructive-rgb), 0.8)' : 'none',
                      }
                    })}
                    onSelectEvent={handleSelectEvent}
                    components={{
                      event: (props: any) => (
                        <div 
                          className="h-full w-full flex items-center" 
                          onClick={() => props.onClick && props.onClick()}
                        >
                          <div className="truncate text-xs text-primary-foreground">{props.title}</div>
                        </div>
                      ),
                    }}
                    formats={{
                      dateFormat: (date) => formatDate(date),
                      dayFormat: (date) => format(date, 'EEE dd'),
                    }}
                  />
                </div>
              </Card>
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Attention Required</h2>
                    
                    <div className="flex gap-2">
                      <Select
                        value={selectedAsset}
                        onValueChange={setSelectedAsset}
                      >
                        <SelectTrigger className="w-[150px]">
                          <span>{selectedAsset === 'all' ? 'All Assets' : getAssetName(parseInt(selectedAsset))}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Assets</SelectItem>
                          {assets.map(asset => (
                            <SelectItem key={asset.id} value={asset.id.toString()}>{asset.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={selectedFrequency}
                        onValueChange={setSelectedFrequency}
                      >
                        <SelectTrigger className="w-[150px]">
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
                          <SelectItem value="ANNUALLY">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                
                  <Calendar
                    localizer={localizer}
                    events={events.filter(event => 
                      (event.resource.isOverdue || isToday(new Date(event.start)))
                    )}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: "600px" }}
                    defaultView="agenda"
                    views={["agenda"]}
                    messages={{
                      agenda: 'Tasks',
                    }}
                    components={{
                      agenda: {
                        event: (props: any) => <CustomAgenda {...props} onSelectEvent={handleSelectEvent} />,
                      },
                    }}
                    formats={{
                      agendaDateFormat: (date) => formatDate(date),
                    }}
                  />
                </div>
              </Card>
            </div>
          )}

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
              {selectedEvent && (
                <div className="space-y-6">
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
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Description</p>
                        <p className="whitespace-pre-wrap">{selectedEvent.resource.description}</p>
                      </div>
                    </div>
                  </div>

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