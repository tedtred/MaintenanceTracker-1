#!/bin/bash

# Fix assets.tsx
cat > client/src/pages/assets.tsx.new << 'EOF'
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Asset,
  InsertAsset,
  AssetStatus,
  AssetCategory,
  MaintenanceSchedule,
  InsertMaintenanceSchedule,
  MaintenanceFrequency,
  MaintenanceStatus,
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Search,
  Calendar,
  Download,
  Upload,
  Edit2,
  Trash2,
  Factory,
  Wrench,
  Truck,
  Server,
  Cpu,
  Tool,
  Printer,
  HardDrive,
  Zap,
  Box,
  LayoutGrid,
} from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";
import { format } from "date-fns";

// This is the main component for the Assets page
export default function AssetsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Query to fetch assets
  const assetsQuery = useQuery({
    queryKey: ["/api/assets"],
    queryFn: () => apiRequest<Asset[]>("GET", "/api/assets"),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: InsertAsset) => apiRequest("POST", "/api/assets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Asset Created",
        description: "Asset has been created successfully",
      });
      form.reset();
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
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/assets/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Status Updated",
        description: "Asset status has been updated",
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Asset Deleted",
        description: "Asset has been deleted successfully",
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

  const createMaintenanceScheduleMutation = useMutation({
    mutationFn: (data: InsertMaintenanceSchedule) =>
      apiRequest("POST", "/api/maintenance-schedules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      setIsMaintenanceDialogOpen(false);
      toast({
        title: "Schedule Created",
        description: "Maintenance schedule has been created",
      });
      maintenanceForm.reset();
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
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/maintenance-schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      toast({
        title: "Schedule Deleted",
        description: "Maintenance schedule has been deleted",
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

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequest<{
        success: boolean;
        totalRows: number;
        successfulImports: number;
      }>("POST", "/api/assets/import", formData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      setIsImportDialogOpen(false);
      toast({
        title: "Import Completed",
        description: `Successfully imported ${data.successfulImports} of ${data.totalRows} assets`,
      });
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Import Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Forms
  const assetFormSchema = insertAssetSchema.extend({
    purchaseDate: z.date().optional().nullable(),
  });
  
  const form = useForm<z.infer<typeof assetFormSchema>>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      status: AssetStatus.OPERATIONAL,
      category: AssetCategory.MACHINERY,
      manufacturer: "",
      modelNumber: "",
      serialNumber: "",
      commissionedDate: null,
      lastMaintenance: null,
      purchaseDate: null,
    },
  });

  const maintenanceFormSchema = insertMaintenanceScheduleSchema.extend({
    startDate: z.date(),
    endDate: z.date().optional().nullable(),
  });

  const maintenanceForm = useForm<z.infer<typeof maintenanceFormSchema>>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      title: "",
      description: "",
      assetId: 0,
      frequency: MaintenanceFrequency.MONTHLY,
      status: MaintenanceStatus.ACTIVE,
      startDate: new Date(),
      endDate: null,
      affectsAssetStatus: true,
      lastCompleted: null,
    },
  });

  // Data handling
  const assets = assetsQuery.data || [];
  
  const maintenanceSchedulesQuery = useQuery({
    queryKey: ["/api/maintenance-schedules"],
    queryFn: () => apiRequest<MaintenanceSchedule[]>("GET", "/api/maintenance-schedules"),
  });
  
  const maintenanceSchedules = maintenanceSchedulesQuery.data || [];

  // Filtered assets based on search query and category
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedCategory === "ALL" || asset.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Helper to get schedules for a specific asset
  const getAssetMaintenanceSchedules = (assetId: number) => {
    return maintenanceSchedules.filter(
      (schedule) => schedule.assetId === assetId
    );
  };

  // Icon for asset categories
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case AssetCategory.MACHINERY:
        return <Factory className="h-5 w-5 text-primary" />;
      case AssetCategory.EQUIPMENT:
        return <Wrench className="h-5 w-5 text-primary" />;
      case AssetCategory.VEHICLE:
        return <Truck className="h-5 w-5 text-primary" />;
      case AssetCategory.IT_HARDWARE:
        return <Server className="h-5 w-5 text-primary" />;
      case AssetCategory.ELECTRONICS:
        return <Cpu className="h-5 w-5 text-primary" />;
      case AssetCategory.TOOLS:
        return <Tool className="h-5 w-5 text-primary" />;
      case AssetCategory.OFFICE_EQUIPMENT:
        return <Printer className="h-5 w-5 text-primary" />;
      case AssetCategory.STORAGE:
        return <HardDrive className="h-5 w-5 text-primary" />;
      case AssetCategory.UTILITIES:
        return <Zap className="h-5 w-5 text-primary" />;
      case AssetCategory.INVENTORY:
        return <Box className="h-5 w-5 text-primary" />;
      default:
        return <LayoutGrid className="h-5 w-5 text-primary" />;
    }
  };

  // CSV export handler
  const handleExport = async () => {
    try {
      const response = await apiRequest<string>("GET", "/api/assets/export", null, {
        responseType: "text",
      });
      
      // Create blob and download link
      const blob = new Blob([response], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asset-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Asset data has been exported to CSV",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Main component render
  return (
    <>
      <div className="w-full">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Assets</h1>
              <p className="text-muted-foreground">
                Manage and track equipment status
              </p>
            </div>

            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[280px]"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {Object.values(AssetCategory).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>

              <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Add Asset
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.map((asset) => (
              <Card key={asset.id}>
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(asset.category)}
                      <CardTitle className="text-xl">{asset.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
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

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this asset and all its maintenance schedules.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(asset.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
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
                      {asset.lastMaintenance && (
                        <div>
                          <strong>Last Maintenance:</strong>{" "}
                          {new Date(asset.lastMaintenance).toLocaleDateString()}
                        </div>
                      )}
                      {asset.commissionedDate && (
                        <div>
                          <strong>Commissioned:</strong>{" "}
                          {new Date(asset.commissionedDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
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
                        className="p-2 bg-muted rounded-lg text-sm space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{schedule.title}</div>
                            <div className="text-muted-foreground">
                              {schedule.frequency} |{" "}
                              {new Date(schedule.startDate).toLocaleDateString()}
                            </div>
                            <div className="text-sm mt-1">{schedule.description}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedAsset(asset.id);
                                maintenanceForm.reset({
                                  ...schedule,
                                  startDate: new Date(schedule.startDate),
                                  endDate: schedule.endDate ? new Date(schedule.endDate) : null,
                                });
                                setIsMaintenanceDialogOpen(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Maintenance Schedule</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this maintenance schedule.
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteMaintenanceScheduleMutation.mutate(schedule.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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
                name="commissionedDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Commissioned Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value && "text-muted-foreground"
                            }`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value as Date}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2 space-x-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Asset"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {maintenanceForm.getValues().id
                ? "Edit Maintenance Schedule"
                : "Create Maintenance Schedule"}
            </DialogTitle>
            <DialogDescription>
              Schedule regular maintenance for this asset
            </DialogDescription>
          </DialogHeader>
          <Form {...maintenanceForm}>
            <form
              onSubmit={maintenanceForm.handleSubmit((data) => {
                // Check if we're editing or creating
                if (data.id) {
                  // Edit existing schedule
                  apiRequest("PATCH", `/api/maintenance-schedules/${data.id}`, data)
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
                      setIsMaintenanceDialogOpen(false);
                      toast({
                        title: "Schedule Updated",
                        description: "Maintenance schedule has been updated",
                      });
                      maintenanceForm.reset();
                    })
                    .catch((error) => {
                      toast({
                        title: "Error",
                        description: error.message,
                        variant: "destructive",
                      });
                    });
                } else {
                  // Create new schedule
                  createMaintenanceScheduleMutation.mutate(data);
                }
              })}
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
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(MaintenanceFrequency).map((frequency) => (
                          <SelectItem key={frequency} value={frequency}>
                            {frequency}
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value && "text-muted-foreground"
                              }`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={maintenanceForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value && "text-muted-foreground"
                              }`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>No end date</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={maintenanceForm.control}
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
                        {Object.values(MaintenanceStatus).map((status) => (
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
                control={maintenanceForm.control}
                name="affectsAssetStatus"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Affects Asset Status</FormLabel>
                      <FormDescription>
                        If checked, overdue maintenance will change the asset status
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <div className="pt-2 space-x-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsMaintenanceDialogOpen(false);
                    maintenanceForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMaintenanceScheduleMutation.isPending}>
                  {createMaintenanceScheduleMutation.isPending
                    ? "Saving..."
                    : maintenanceForm.getValues().id
                    ? "Update Schedule"
                    : "Create Schedule"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Assets</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import assets and maintenance schedules
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-md p-4">
              <div className="space-y-2">
                <label className="block font-medium">Select CSV File</label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Download the{" "}
                <a
                  href="/asset-import-template.csv"
                  download
                  className="text-primary underline"
                >
                  template CSV
                </a>{" "}
                to see the required format.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">CSV Format Requirements</h3>
              <p className="text-sm text-muted-foreground">
                The CSV must include the following columns:
              </p>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Asset Name (required)</li>
                <li>Description (required)</li>
                <li>Location (required)</li>
                <li>Category (must match one of the system categories)</li>
                <li>Status (must match one of the system statuses)</li>
                <li>Manufacturer (optional)</li>
                <li>Model Number (optional)</li>
                <li>Serial Number (optional)</li>
                <li>
                  Maintenance Title, Frequency, and Start Date (for maintenance
                  schedules)
                </li>
              </ul>
            </div>
            <div className="pt-2 space-x-2 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!selectedFile || importMutation.isPending}
                onClick={() => {
                  if (selectedFile) {
                    importMutation.mutate(selectedFile);
                  }
                }}
              >
                {importMutation.isPending ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
EOF

# Replace original file with new one
mv client/src/pages/assets.tsx.new client/src/pages/assets.tsx

echo "Fixed assets.tsx file"
