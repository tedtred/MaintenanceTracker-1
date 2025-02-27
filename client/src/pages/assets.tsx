import { useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Asset, InsertAsset, AssetStatus, MaintenanceSchedule, InsertMaintenanceSchedule, MaintenanceFrequency, MaintenanceStatus } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { insertAssetSchema, insertMaintenanceScheduleSchema } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function Assets() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: maintenanceSchedules = [] } = useQuery<MaintenanceSchedule[]>({
    queryKey: ["/api/maintenance-schedules"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertAsset) => {
      const res = await apiRequest("POST", "/api/assets", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Asset created successfully",
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

  const createMaintenanceMutation = useMutation({
    mutationFn: async (data: InsertMaintenanceSchedule) => {
      const res = await apiRequest("POST", "/api/maintenance-schedules", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      setIsMaintenanceDialogOpen(false);
      maintenanceForm.reset();
      toast({
        title: "Success",
        description: "Maintenance schedule created successfully",
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/assets/${id}`, {
        status,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    },
  });

  const form = useForm<InsertAsset>({
    resolver: zodResolver(insertAssetSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      status: AssetStatus.OPERATIONAL,
    },
  });

  const maintenanceForm = useForm<InsertMaintenanceSchedule>({
    resolver: zodResolver(insertMaintenanceScheduleSchema),
    defaultValues: {
      title: "",
      description: "",
      frequency: MaintenanceFrequency.MONTHLY,
      status: MaintenanceStatus.SCHEDULED,
      startDate: new Date(),
      endDate: null,
      assetId: undefined,
    },
  });

  const getAssetMaintenanceSchedules = (assetId: number) => {
    return maintenanceSchedules.filter((schedule) => schedule.assetId === assetId);
  };

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Assets</h1>
              <p className="text-muted-foreground">
                Manage and track equipment status
              </p>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Asset</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Asset</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) =>
                      createMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(AssetStatus).map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createMutation.isPending}
                    >
                      Add Asset
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <Card key={asset.id}>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">{asset.name}</CardTitle>
                  <Select
                    value={asset.status}
                    onValueChange={(status) =>
                      updateStatusMutation.mutate({ id: asset.id, status })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AssetStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {asset.description}
                    </p>
                    <div className="text-sm">
                      <strong>Location:</strong> {asset.location}
                    </div>
                    {asset.lastMaintenance && (
                      <div className="text-sm">
                        <strong>Last Maintenance:</strong>{" "}
                        {new Date(asset.lastMaintenance).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Maintenance Schedules</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAsset(asset.id);
                          maintenanceForm.setValue('assetId', asset.id);
                          setIsMaintenanceDialogOpen(true);
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Add Schedule
                      </Button>
                    </div>
                    {getAssetMaintenanceSchedules(asset.id).map((schedule) => (
                      <div
                        key={schedule.id}
                        className="p-2 bg-muted rounded-lg text-sm"
                      >
                        <div className="font-medium">{schedule.title}</div>
                        <div className="text-muted-foreground">
                          Frequency: {schedule.frequency}
                        </div>
                        <div className="text-muted-foreground">
                          Next: {new Date(schedule.startDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Maintenance Schedule</DialogTitle>
          </DialogHeader>
          <Form {...maintenanceForm}>
            <form
              onSubmit={maintenanceForm.handleSubmit((data) =>
                createMaintenanceMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={maintenanceForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={maintenanceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={maintenanceForm.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(MaintenanceFrequency).map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {freq}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={maintenanceForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={maintenanceForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? new Date(value) : null);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMaintenanceMutation.isPending}
              >
                Add Schedule
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}