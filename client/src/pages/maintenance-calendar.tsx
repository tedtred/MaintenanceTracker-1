import { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import moment from "moment";
import {
  Calendar as CalendarIcon,
  ListTodo,
  Info,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";

// Shadcn components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

// Custom components and hooks
import { MultiQueryLoader } from "@/components/data-loader";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMaintenanceSchedules } from "@/hooks/use-maintenance-data";
import { useAssets } from "@/hooks/use-asset-data";
import { useSettings } from "@/hooks/use-settings-data";
import { safeArray, safeFind, safeFilter } from "@/lib/utils/array-utils";
import { 
  safeFormat, 
  addDays, 
  addWeeks, 
  addMonths, 
  differenceInDays, 
  isPast, 
  isToday, 
  isFuture 
} from "@/lib/utils/date-utils";

// Schema types
import { 
  MaintenanceSchedule, 
  MaintenanceCompletion, 
  MaintenanceFrequency,
  MaintenanceStatus 
} from "@shared/schema";

// Set up localizer for react-big-calendar
const localizer = momentLocalizer(moment);

// Function to generate recurring events based on schedule
const generateRecurringEvents = (
  schedule: MaintenanceSchedule, 
  assetName: string, 
  completions: MaintenanceCompletion[] | undefined
) => {
  const events = [];
  const start = new Date(schedule.startDate);
  start.setHours(0, 0, 0, 0);
  const end = schedule.endDate ? new Date(schedule.endDate) : addMonths(new Date(), 3);
  end.setHours(23, 59, 59, 999);

  let currentDate = new Date(start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (currentDate <= end) {
    // Use the safe array utilities to handle null/undefined
    const isCompleted = safeFilter(completions, completion => 
      completion.scheduleId === schedule.id &&
      format(new Date(completion.completedDate), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
    ).length > 0;

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
      case MaintenanceFrequency.SEMI_ANNUAL:
        currentDate = addMonths(currentDate, 6);
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
  // Local state
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [currentView, setCurrentView] = useState<string>("month");
  const [unifiedView, setUnifiedView] = useState<boolean>(true);
  const [selectedAsset, setSelectedAsset] = useState<string>("all");
  const [selectedFrequency, setSelectedFrequency] = useState<string>("all");
  
  // Hooks
  const isMobile = useIsMobile();
  const form = useForm({
    defaultValues: {
      notes: "",
    },
  });

  // Data hooks
  const { 
    schedulesQuery, 
    completionsQuery, 
    deleteScheduleMutation, 
    completeMaintenanceMutation 
  } = useMaintenanceSchedules();
  
  const { assetsQuery, updateAssetMutation } = useAssets();
  const { settingsQuery } = useSettings();

  // Helper functions
  const getAssetName = (assetId: number) => {
    const asset = safeFind(assetsQuery.data, a => a.id === assetId);
    return asset ? asset.name : 'Unknown Asset';
  };

  const getAssetDetails = (assetId: number) => {
    return safeFind(assetsQuery.data, a => a.id === assetId);
  };

  const getCompletionHistory = (scheduleId: number) => {
    return safeFilter(completionsQuery.data, c => c.scheduleId === scheduleId)
      .sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());
  };

  // Filter schedules based on selected asset and frequency
  const filteredSchedules = safeFilter(schedulesQuery.data, schedule => {
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

  // Generate events for the calendar
  const events = filteredSchedules.flatMap((schedule) =>
    generateRecurringEvents(schedule, getAssetName(schedule.assetId), completionsQuery.data)
  );

  // Event handlers
  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  const showDetails = (event: any) => {
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  const handleCompleteClick = () => {
    setIsDetailsDialogOpen(false);
    setIsCompleteDialogOpen(true);
  };

  // Update week start day from settings
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

  // Handle updating asset status
  const handleUpdateAssetStatus = (assetId: number, status: string) => {
    updateAssetMutation.mutate({ 
      id: assetId, 
      updates: { status } 
    });
  };

  // Handle completing maintenance
  const handleCompleteMaintenance = () => {
    if (selectedEvent && form.getValues()) {
      completeMaintenanceMutation.mutate({
        scheduleId: selectedEvent.resource.id,
        completedDate: new Date(),
        notes: form.getValues().notes || undefined,
      });
      setIsCompleteDialogOpen(false);
    }
  };

  // Handle deleting schedule
  const handleDeleteSchedule = (id: number) => {
    if (confirm("Are you sure you want to delete this maintenance schedule?")) {
      deleteScheduleMutation.mutate(id);
      setIsDetailsDialogOpen(false);
    }
  };
  
  // Use our data loader to handle loading and error states
  return (
    <MultiQueryLoader
      queries={[schedulesQuery, assetsQuery, completionsQuery, settingsQuery]}
    >
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
                          {Array.isArray(assetsQuery.data) && assetsQuery.data.map( asset => (
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
                              : selectedFrequency === MaintenanceFrequency.DAILY ? 'Daily'
                              : selectedFrequency === MaintenanceFrequency.WEEKLY ? 'Weekly'
                              : selectedFrequency === MaintenanceFrequency.BI_WEEKLY ? 'Bi-Weekly'
                              : selectedFrequency === MaintenanceFrequency.MONTHLY ? 'Monthly'
                              : selectedFrequency === MaintenanceFrequency.BI_MONTHLY ? 'Bi-Monthly'
                              : selectedFrequency === MaintenanceFrequency.QUARTERLY ? 'Quarterly'
                              : selectedFrequency === MaintenanceFrequency.SEMI_ANNUAL ? 'Semi-Annually'
                              : selectedFrequency === MaintenanceFrequency.YEARLY ? 'Annually'
                              : selectedFrequency === MaintenanceFrequency.EIGHTEEN_MONTHS ? '18 Months'
                              : selectedFrequency === MaintenanceFrequency.TWO_YEAR ? '2 Years'
                              : selectedFrequency === MaintenanceFrequency.THREE_YEAR ? '3 Years'
                              : selectedFrequency === MaintenanceFrequency.FIVE_YEAR ? '5 Years'
                              : selectedFrequency === MaintenanceFrequency.CUSTOM ? 'Custom'
                              : 'Unknown Frequency'
                            }
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Frequencies</SelectItem>
                          <SelectItem value={MaintenanceFrequency.DAILY}>Daily</SelectItem>
                          <SelectItem value={MaintenanceFrequency.WEEKLY}>Weekly</SelectItem>
                          <SelectItem value={MaintenanceFrequency.BI_WEEKLY}>Bi-Weekly</SelectItem>
                          <SelectItem value={MaintenanceFrequency.MONTHLY}>Monthly</SelectItem>
                          <SelectItem value={MaintenanceFrequency.BI_MONTHLY}>Bi-Monthly</SelectItem>
                          <SelectItem value={MaintenanceFrequency.QUARTERLY}>Quarterly</SelectItem>
                          <SelectItem value={MaintenanceFrequency.SEMI_ANNUAL}>Semi-Annually</SelectItem>
                          <SelectItem value={MaintenanceFrequency.YEARLY}>Annually</SelectItem>
                          <SelectItem value={MaintenanceFrequency.EIGHTEEN_MONTHS}>18 Months</SelectItem>
                          <SelectItem value={MaintenanceFrequency.TWO_YEAR}>2 Years</SelectItem>
                          <SelectItem value={MaintenanceFrequency.THREE_YEAR}>3 Years</SelectItem>
                          <SelectItem value={MaintenanceFrequency.FIVE_YEAR}>5 Years</SelectItem>
                          <SelectItem value={MaintenanceFrequency.CUSTOM}>Custom</SelectItem>
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
                          {Array.isArray(assetsQuery.data) && assetsQuery.data.map( asset => (
                            <SelectItem key={asset.id} value={asset.id.toString()}>{asset.name}</SelectItem>
                          ))}
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
                            : selectedFrequency === MaintenanceFrequency.DAILY ? 'Daily'
                            : selectedFrequency === MaintenanceFrequency.WEEKLY ? 'Weekly'
                            : selectedFrequency === MaintenanceFrequency.BI_WEEKLY ? 'Bi-Weekly'
                            : selectedFrequency === MaintenanceFrequency.MONTHLY ? 'Monthly'
                            : selectedFrequency === MaintenanceFrequency.BI_MONTHLY ? 'Bi-Monthly'
                            : selectedFrequency === MaintenanceFrequency.QUARTERLY ? 'Quarterly'
                            : selectedFrequency === MaintenanceFrequency.SEMI_ANNUAL ? 'Semi-Annually'
                            : selectedFrequency === MaintenanceFrequency.YEARLY || selectedFrequency === MaintenanceFrequency.ANNUAL ? 'Yearly'
                            : selectedFrequency === MaintenanceFrequency.EIGHTEEN_MONTHS ? '18 Months'
                            : selectedFrequency === MaintenanceFrequency.TWO_YEAR ? '2 Years'
                            : selectedFrequency === MaintenanceFrequency.THREE_YEAR ? '3 Years'
                            : selectedFrequency === MaintenanceFrequency.FIVE_YEAR ? '5 Years'
                            : selectedFrequency === MaintenanceFrequency.CUSTOM ? 'Custom'
                            : 'All Frequencies'
                          }
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Frequencies</SelectItem>
                        <SelectItem value={MaintenanceFrequency.DAILY}>Daily</SelectItem>
                        <SelectItem value={MaintenanceFrequency.WEEKLY}>Weekly</SelectItem>
                        <SelectItem value={MaintenanceFrequency.BI_WEEKLY}>Bi-Weekly</SelectItem>
                        <SelectItem value={MaintenanceFrequency.MONTHLY}>Monthly</SelectItem>
                        <SelectItem value={MaintenanceFrequency.BI_MONTHLY}>Bi-Monthly</SelectItem>
                        <SelectItem value={MaintenanceFrequency.QUARTERLY}>Quarterly</SelectItem>
                        <SelectItem value={MaintenanceFrequency.SEMI_ANNUAL}>Semi-Annually</SelectItem>
                        <SelectItem value={MaintenanceFrequency.YEARLY}>Yearly</SelectItem>
                        <SelectItem value={MaintenanceFrequency.EIGHTEEN_MONTHS}>18 Months</SelectItem>
                        <SelectItem value={MaintenanceFrequency.TWO_YEAR}>2 Years</SelectItem>
                        <SelectItem value={MaintenanceFrequency.THREE_YEAR}>3 Years</SelectItem>
                        <SelectItem value={MaintenanceFrequency.FIVE_YEAR}>5 Years</SelectItem>
                        <SelectItem value={MaintenanceFrequency.CUSTOM}>Custom</SelectItem>
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

            {/* Dialogs */}
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
                            onClick={() => handleDeleteSchedule(selectedEvent.resource.id)}
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
                              : selectedEvent.resource.status === MaintenanceStatus.SCHEDULED
                              ? 'Scheduled'
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
                                  handleUpdateAssetStatus(selectedEvent.resource.assetId, status)
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
                                <p className="text-muted-foreground">Status</p>
                                <p>{asset.status}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Location</p>
                                <p>{asset.location}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Category</p>
                                <p>{asset.category}</p>
                              </div>
                            </div>
                          ) : null;
                        })()}
                        
                        {/* Show completion history */}
                        <div className="mt-6">
                          <h3 className="font-medium mb-2">Completion History</h3>
                          {(() => {
                            const history = getCompletionHistory(selectedEvent.resource.id);
                            return history.length > 0 ? (
                              <div className="space-y-2 text-sm">
                                {history.map((completion, index) => (
                                  <div key={index} className="border-l-2 border-primary pl-3 py-1">
                                    <div className="flex justify-between">
                                      <p className="font-medium">{formatDate(new Date(completion.completedDate))}</p>
                                    </div>
                                    {completion.notes && <p className="text-muted-foreground">{completion.notes}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No completion records</p>
                            );
                          })()}
                        </div>
                      </div>
                    )}
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
                    <div>
                      <h2 className="font-medium">{selectedEvent.title}</h2>
                      <p className="text-sm text-muted-foreground">{formatDate(selectedEvent.resource.originalDate)}</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="notes" className="text-sm font-medium">Notes</label>
                        <textarea 
                          id="notes"
                          className="w-full min-h-[100px] p-2 rounded-md border border-input bg-transparent"
                          placeholder="Add completion notes..."
                          {...form.register("notes")}
                        />
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCompleteMaintenance}>
                          Mark as Completed
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </MultiQueryLoader>
  );
}