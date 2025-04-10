import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings, WeekDay, UserRole, insertSettingsSchema, AvailablePages } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  Calendar, 
  Bell, 
  Palette, 
  Building, 
  WrenchIcon, 
  Upload,
  Info,
  Trash2,
  PlusCircle,
  CalendarDays
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { SidebarNav } from "@/components/sidebar-nav";

const settingsSections = [
  {
    id: "schedule",
    title: "Work Schedule",
    icon: <Clock className="mr-2 h-4 w-4" />,
  },
  {
    id: "dateTime",
    title: "Date & Time",
    icon: <Calendar className="mr-2 h-4 w-4" />,
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: <Bell className="mr-2 h-4 w-4" />,
  },
  {
    id: "appearance",
    title: "Appearance",
    icon: <Palette className="mr-2 h-4 w-4" />,
  },
  {
    id: "company",
    title: "Company Profile",
    icon: <Building className="mr-2 h-4 w-4" />,
  },

  {
    id: "holidays",
    title: "Holiday Calendar",
    icon: <CalendarDays className="mr-2 h-4 w-4" />,
  },
  {
    id: "advanced",
    title: "Advanced",
    icon: <WrenchIcon className="mr-2 h-4 w-4" />,
  },
];

interface HolidayDate {
  id: string;
  name: string;
  date: string;
  isRecurringYearly: boolean;
}



export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("schedule");
  const [holidays, setHolidays] = useState<HolidayDate[]>([]);


  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['/api/settings']
  });
  
  // Process settings data when it's loaded
  useEffect(() => {
    if (settings) {
      // Parse holiday calendar data when settings load
      if (settings.holidayCalendar) {
        try {
          const parsedHolidays = JSON.parse(settings.holidayCalendar);
          if (Array.isArray(parsedHolidays)) {
            setHolidays(parsedHolidays);
          }
        } catch (error) {
          console.error("Failed to parse holiday calendar data:", error);
        }
      }
      

    }
  }, [settings]);

  const form = useForm({
    resolver: zodResolver(insertSettingsSchema),
    defaultValues: settings || {
      // Work Schedule
      workWeekStart: 1,
      workWeekEnd: 5,
      workDayStart: "09:00",
      workDayEnd: "17:00",
      
      // Date & Time
      timeZone: "UTC",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "HH:mm",
      
      // Notifications
      emailNotifications: true,
      maintenanceDueReminder: 1,
      criticalAlertsOnly: false,
      
      // Appearance
      theme: "system",
      accentColor: "#0284c7",
      
      // Company
      companyName: "",
      companyLogo: "",
      
      // Holiday Calendar
      holidayCalendar: "[]",
      
      // User Access
      roleDefaultPages: "{}"
    }
  });

  const addHoliday = () => {
    const newHoliday: HolidayDate = {
      id: Math.random().toString(36).substring(2, 9),
      name: "",
      date: new Date().toISOString().split('T')[0],
      isRecurringYearly: false
    };
    setHolidays([...holidays, newHoliday]);
  };

  const updateHoliday = (id: string, field: keyof HolidayDate, value: any) => {
    setHolidays(holidays.map(holiday => 
      holiday.id === id ? { ...holiday, [field]: value } : holiday
    ));
  };

  const removeHoliday = (id: string) => {
    setHolidays(holidays.filter(holiday => holiday.id !== id));
  };

  

  // Update form with holidays before submit
  const prepareSubmitData = (formData: Settings) => {
    return {
      ...formData,
      holidayCalendar: JSON.stringify(holidays),
      // Keep the existing roleDefaultPages setting
      roleDefaultPages: settings?.roleDefaultPages || "{}"
    };
  };

  const mutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Settings) => {
    const updatedData = prepareSubmitData(data);
    mutation.mutate(updatedData);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <SidebarNav />
        <div className="w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/4 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 overflow-auto">
        <div className="container py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your system preferences and application settings.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            {/* Settings Navigation Sidebar */}
            <aside className="md:w-1/5">
              <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1 overflow-auto md:sticky md:top-4">
                {settingsSections.map((section) => (
                  <Button
                    key={section.id}
                    variant={activeTab === section.id ? "secondary" : "ghost"}
                    className={cn(
                      "justify-start",
                      activeTab === section.id && "bg-muted"
                    )}
                    onClick={() => setActiveTab(section.id)}
                  >
                    {section.icon}
                    {section.title}
                  </Button>
                ))}
              </nav>
            </aside>

            {/* Settings Content */}
            <div className="flex-1">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  
                  {/* Work Schedule Section */}
                  {activeTab === "schedule" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Work Schedule
                        </CardTitle>
                        <CardDescription>
                          Configure your organization's standard work week and hours
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Work Week */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Work Week</h3>
                            <FormField
                              control={form.control}
                              name="workWeekStart"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Week Starts On</FormLabel>
                                  <Select 
                                    onValueChange={val => field.onChange(parseInt(val))} 
                                    defaultValue={field.value.toString()}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Object.entries(WeekDay).map(([key, value]) => (
                                        <SelectItem key={value} value={value.toString()}>
                                          {key.charAt(0) + key.slice(1).toLowerCase()}
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
                              name="workWeekEnd"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Week Ends On</FormLabel>
                                  <Select 
                                    onValueChange={val => field.onChange(parseInt(val))} 
                                    defaultValue={field.value.toString()}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Object.entries(WeekDay).map(([key, value]) => (
                                        <SelectItem key={value} value={value.toString()}>
                                          {key.charAt(0) + key.slice(1).toLowerCase()}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Work Hours */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Work Hours</h3>
                            <FormField
                              control={form.control}
                              name="workDayStart"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Work Day Start</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="workDayEnd"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Work Day End</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Date & Time Section */}
                  {activeTab === "dateTime" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Date & Time
                        </CardTitle>
                        <CardDescription>
                          Configure regional settings and date/time formats
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="timeZone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Time Zone</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="h-[300px]">
                                    {Intl.supportedValuesOf('timeZone').map((tz) => (
                                      <SelectItem key={tz} value={tz}>
                                        {tz}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Select your organization's primary time zone
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="dateFormat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date Format</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (EU)</SelectItem>
                                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="timeFormat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Time Format</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="HH:mm">24-hour (HH:mm)</SelectItem>
                                    <SelectItem value="hh:mm A">12-hour (hh:mm AM/PM)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Notifications Section */}
                  {activeTab === "notifications" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Bell className="h-5 w-5" />
                          Notifications
                        </CardTitle>
                        <CardDescription>
                          Configure how and when you receive system notifications
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid gap-6">
                          <FormField
                            control={form.control}
                            name="emailNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Email Notifications</FormLabel>
                                  <FormDescription>
                                    Receive maintenance alerts and work order updates via email
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="maintenanceDueReminder"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Maintenance Due Reminder (Days)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    min={0}
                                    max={30}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Number of days before scheduled maintenance to send reminders
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="criticalAlertsOnly"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Critical Alerts Only</FormLabel>
                                  <FormDescription>
                                    Only receive notifications for high-priority and critical maintenance tasks
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Appearance Section */}
                  {activeTab === "appearance" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Palette className="h-5 w-5" />
                          Appearance
                        </CardTitle>
                        <CardDescription>
                          Customize the look and feel of your application
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="theme"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Theme</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Choose your preferred color theme
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="accentColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Accent Color</FormLabel>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-6 h-6 rounded-full border"
                                    style={{ backgroundColor: field.value }}
                                  ></div>
                                  <FormControl>
                                    <Input 
                                      type="color" 
                                      {...field} 
                                      className="w-full"
                                    />
                                  </FormControl>
                                </div>
                                <FormDescription>
                                  Select a primary color for buttons and accents
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Company Profile Section */}
                  {activeTab === "company" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Company Profile
                        </CardTitle>
                        <CardDescription>
                          Add your company information and branding
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid gap-6">
                          <FormField
                            control={form.control}
                            name="companyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="companyLogo"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Logo URL</FormLabel>
                                <FormControl>
                                  <div className="flex flex-col space-y-2">
                                    <Input {...field} placeholder="https://your-company.com/logo.png" />
                                    {field.value && (
                                      <div className="mt-2 p-4 border rounded">
                                        <p className="text-sm mb-2">Logo Preview:</p>
                                        <img 
                                          src={field.value} 
                                          alt="Company Logo" 
                                          className="max-h-24 max-w-full"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://placehold.co/200x100?text=Logo+Error';
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormDescription>
                                  Enter a URL to your company logo
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}



                  {/* Holiday Calendar Section */}
                  {activeTab === "holidays" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarDays className="h-5 w-5" />
                          Holiday Calendar
                        </CardTitle>
                        <CardDescription>
                          Manage company holidays and special non-working days
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid gap-4">
                          {holidays.map((holiday, index) => (
                            <div key={holiday.id} className="p-4 border rounded-lg flex flex-col md:flex-row gap-4">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input 
                                  placeholder="Holiday Name" 
                                  value={holiday.name} 
                                  onChange={(e) => updateHoliday(holiday.id, 'name', e.target.value)}
                                />
                                <Input 
                                  type="date" 
                                  value={holiday.date} 
                                  onChange={(e) => updateHoliday(holiday.id, 'date', e.target.value)}
                                />
                                <div className="md:col-span-2 flex items-center space-x-2">
                                  <Switch 
                                    id={`recurring-${holiday.id}`} 
                                    checked={holiday.isRecurringYearly}
                                    onCheckedChange={(checked) => updateHoliday(holiday.id, 'isRecurringYearly', checked)}
                                  />
                                  <label htmlFor={`recurring-${holiday.id}`} className="text-sm">
                                    Repeats yearly
                                  </label>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="shrink-0 h-9 w-9"
                                onClick={() => removeHoliday(holiday.id)}
                                type="button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="mt-2 w-full" 
                            onClick={addHoliday}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Holiday
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Advanced Section */}
                  {activeTab === "advanced" && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <WrenchIcon className="h-5 w-5" />
                          Advanced Settings
                        </CardTitle>
                        <CardDescription>
                          Configure advanced system options
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-amber-700 dark:text-amber-300">Advanced Settings</h4>
                              <p className="text-sm text-amber-600 dark:text-amber-400">
                                This section will be expanded in future updates with data retention policies and system integrations.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-4">
                          <div className="flex justify-between items-center p-4 border rounded-md">
                            <div>
                              <h4 className="font-medium">System Data Export</h4>
                              <p className="text-sm text-muted-foreground">Export all system data for backup</p>
                            </div>
                            <Button type="button" variant="outline">
                              <Upload className="mr-2 h-4 w-4" />
                              Export
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Save Button */}
                  <div className="sticky bottom-0 bg-background pt-4 pb-6 flex justify-end gap-2 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => form.reset()}
                    >
                      Reset
                    </Button>
                    <Button type="submit" className="min-w-[100px]">
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
