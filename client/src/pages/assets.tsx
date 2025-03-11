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
} from "@/components/ui/card";
import { Calendar, Wrench, Car, Monitor, Box, Search, Upload } from "lucide-react";
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
import { Trash2, Edit2 } from "lucide-react";

interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: Array<{
    row: number;
    error: string;
    data?: Record<string, any>;
  }>;
  importedAssets: Asset[];
}

export default function Assets() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: maintenanceSchedules = [] } = useQuery<MaintenanceSchedule[]>({
    queryKey: ["/api/maintenance-schedules"],
  });

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = searchQuery === "" ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (asset.modelNumber && asset.modelNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "ALL" || asset.category === selectedCategory;

    return matchesSearch && matchesCategory;
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

  const createMaintenanceScheduleMutation = useMutation({
    mutationFn: async (data: InsertMaintenanceSchedule) => {
      const res = await apiRequest("POST", "/api/maintenance-schedules", {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      });
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      toast({
        title: "Success",
        description: "Asset deleted successfully",
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
      toast({
        title: "Success",
        description: "Maintenance schedule deleted successfully",
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

  const updateMaintenanceScheduleMutation = useMutation({
    mutationFn: async (data: MaintenanceSchedule) => {
      const res = await apiRequest("PATCH", `/api/maintenance-schedules/${data.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      setIsMaintenanceDialogOpen(false);
      maintenanceForm.reset();
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

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiRequest("POST", "/api/assets/import", formData, {
        headers: {
          'Content-Type': undefined,
        },
      });
      return res.json();
    },
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
        toast({
          title: "Success",
          description: `Successfully imported ${data.successfulImports} assets`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
      commissionedDate: "",
    },
  });

  const maintenanceForm = useForm<InsertMaintenanceSchedule>({
    resolver: zodResolver(insertMaintenanceScheduleSchema),
    defaultValues: {
      title: "",
      description: "",
      frequency: MaintenanceFrequency.MONTHLY,
      status: MaintenanceStatus.SCHEDULED,
      startDate: new Date().toISOString().split("T")[0],
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
                                maintenanceForm.reset(schedule);
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
              <FormField
                control={form.control}
                name="commissionedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Date</FormLabel>
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

      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {maintenanceForm.getValues("id") ? "Edit" : "Add"} Maintenance Schedule
            </DialogTitle>
          </DialogHeader>
          <Form {...maintenanceForm}>
            <form
              onSubmit={maintenanceForm.handleSubmit((data) => {
                if (data.id) {
                  updateMaintenanceScheduleMutation.mutate(data as MaintenanceSchedule);
                } else {
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
                disabled={createMaintenanceScheduleMutation.isPending || updateMaintenanceScheduleMutation.isPending}
              >
                {maintenanceForm.getValues("id") ? "Update" : "Add"} Schedule
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Import Assets from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with the following columns: name, description, location, status,
                  category, manufacturer, modelNumber, serialNumber, commissionedDate, lastMaintenance
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/5 hover:bg-muted/10">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground/75">
                        CSV files only
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".csv"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{selectedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                )}

                {importResult && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Rows:</span>
                      <span>{importResult.totalRows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Successfully Imported:</span>
                      <span className="text-green-600">{importResult.successfulImports}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed Imports:</span>
                      <span className="text-red-600">{importResult.failedImports}</span>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Errors:</h4>
                        <div className="max-h-32 overflow-y-auto space-y-2">
                          {importResult.errors.map((error, index) => (
                            <div key={index} className="text-xs text-red-600">
                              Row {error.row}: {error.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full"
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
            </DialogContent>
          </Dialog>
    </div>
  );
}