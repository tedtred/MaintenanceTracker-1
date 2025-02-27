import { useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Asset, 
  InsertAsset, 
  AssetStatus, 
  AssetCategory,
  MaintenanceSchedule, 
  InsertMaintenanceSchedule, 
  MaintenanceFrequency, 
  MaintenanceStatus 
} from "@shared/schema";
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
import { Calendar, Wrench, Car, Monitor, Box } from "lucide-react";

export default function Assets() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
      category: AssetCategory.MACHINERY,
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case AssetCategory.MACHINERY:
        return <Wrench className="h-5 w-5" />;
      case AssetCategory.VEHICLE:
        return <Car className="h-5 w-5" />;
      case AssetCategory.COMPUTER:
        return <Monitor className="h-5 w-5" />;
      default:
        return <Box className="h-5 w-5" />;
    }
  };

  const filteredAssets = selectedCategory
    ? assets.filter((asset) => asset.category === selectedCategory)
    : assets;

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Assets</h1>
              <p className="text-muted-foreground">
                Manage and track equipment status
              </p>
            </div>

            <div className="flex gap-4">
              <Select
                value={selectedCategory || ""}
                onValueChange={(value) => setSelectedCategory(value || null)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {Object.values(AssetCategory).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Add Asset
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.map((asset) => (
              <Card key={asset.id}>
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(asset.category)}
                    <CardTitle className="text-xl">{asset.name}</CardTitle>
                  </div>
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
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <strong>Location:</strong> {asset.location}
                      </div>
                      <div>
                        <strong>Category:</strong> {asset.category}
                      </div>
                      {asset.manufacturer && (
                        <div>
                          <strong>Manufacturer:</strong> {asset.manufacturer}
                        </div>
                      )}
                      {asset.modelNumber && (
                        <div>
                          <strong>Model:</strong> {asset.modelNumber}
                        </div>
                      )}
                      {asset.serialNumber && (
                        <div>
                          <strong>Serial:</strong> {asset.serialNumber}
                        </div>
                      )}
                      {asset.purchaseDate && (
                        <div>
                          <strong>Purchased:</strong>{" "}
                          {new Date(asset.purchaseDate).toLocaleDateString()}
                        </div>
                      )}
                      {asset.lastMaintenance && (
                        <div>
                          <strong>Last Maintenance:</strong>{" "}
                          {new Date(asset.lastMaintenance).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Maintenance Schedules</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAsset(asset.id);
                          maintenanceForm.setValue("assetId", asset.id);
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
                          {schedule.frequency} |{" "}
                          {new Date(schedule.startDate).toLocaleDateString()}
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

      {/* Create Asset Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(AssetCategory).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
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
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modelNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
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
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value || ''}
                      />
                    </FormControl>
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

      {/* Add Maintenance Schedule Dialog */}
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
                          type="date"
                          {...field}
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
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
                          type="date"
                          {...field}
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
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
                disabled={createMutation.isPending}
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