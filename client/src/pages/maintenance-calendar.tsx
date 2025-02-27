import { SidebarNav } from "@/components/sidebar-nav";
import { useQuery } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { MaintenanceSchedule } from "@shared/schema";

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
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Maintenance Calendar</h1>
            <p className="text-muted-foreground">
              View all scheduled maintenance
            </p>
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
