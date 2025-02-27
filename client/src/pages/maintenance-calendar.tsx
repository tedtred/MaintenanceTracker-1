import { SidebarNav } from "@/components/sidebar-nav";
import { useQuery } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays, addWeeks, addMonths } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { MaintenanceSchedule, Asset, MaintenanceFrequency } from "@shared/schema";
import { Card } from "@/components/ui/card";

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
const generateRecurringEvents = (schedule: MaintenanceSchedule, assetName: string) => {
  const events = [];
  const start = new Date(schedule.startDate);
  const end = schedule.endDate ? new Date(schedule.endDate) : addMonths(new Date(), 3); // Show 3 months of events if no end date

  let currentDate = start;
  while (currentDate <= end) {
    events.push({
      id: `${schedule.id}-${currentDate.toISOString()}`,
      title: `${schedule.title} - ${assetName}`,
      start: new Date(currentDate),
      end: new Date(currentDate),
      resource: {
        ...schedule,
        assetName,
      },
    });

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
        currentDate = end; // Break the loop for one-time events
    }
  }

  return events;
};

export default function MaintenanceCalendar() {
  const { data: schedules = [] } = useQuery<MaintenanceSchedule[]>({
    queryKey: ["/api/maintenance-schedules"],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const getAssetName = (assetId: number) => {
    const asset = assets.find(a => a.id === assetId);
    return asset ? asset.name : 'Unknown Asset';
  };

  // Generate all events including recurring ones
  const events = schedules.flatMap((schedule) => 
    generateRecurringEvents(schedule, getAssetName(schedule.assetId))
  );

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Maintenance Calendar</h1>
            <p className="text-muted-foreground">
              View all scheduled maintenance
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
                className: `bg-primary hover:bg-primary/90 cursor-pointer
                  ${event.resource.status === 'COMPLETED' ? 'opacity-50' : ''}`
              })}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}