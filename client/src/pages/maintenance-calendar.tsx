import { SidebarNav } from "@/components/sidebar-nav";
import { useQuery } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { MaintenanceSchedule, Asset } from "@shared/schema";
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

  const events = schedules.map((schedule) => ({
    id: schedule.id,
    title: `${schedule.title} - ${getAssetName(schedule.assetId)}`,
    start: new Date(schedule.startDate),
    end: schedule.endDate ? new Date(schedule.endDate) : undefined,
    resource: {
      ...schedule,
      assetName: getAssetName(schedule.assetId),
    },
  }));

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
              tooltipAccessor={(event) => `${event.title}\nFrequency: ${event.resource.frequency}\nStatus: ${event.resource.status}`}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}