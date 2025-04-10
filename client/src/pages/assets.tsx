import { useState, useRef, useEffect } from "react";
import { AssetCategory, AssetStatus, Asset, InsertAsset, MaintenanceFrequency, InsertMaintenanceSchedule } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePermissions } from "@/hooks/use-permissions";
import { format, addDays } from "date-fns";

// Import our modular hooks
import { useAssets } from "@/hooks/use-asset-data";
import { useMaintenanceSchedules } from "@/hooks/use-maintenance-data";
import { DataLoader, MultiQueryLoader } from "@/components/data-loader";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { CalendarIcon, Loader2, PlusCircle, ToyBrick, UploadCloud, Wrench, FileUp, Download } from "lucide-react";
import { DataCardView, DataField } from "@/components/ui/data-card-view";

// Define local constants to ensure correct enum usage
const LOCAL_ASSET_CATEGORY = {
  MACHINERY: AssetCategory.MACHINERY,
  VEHICLE: AssetCategory.VEHICLE, 
  TOOL: AssetCategory.TOOL,
  COMPUTER: AssetCategory.COMPUTER,
  OTHER: AssetCategory.OTHER
};

// Maintenance frequency enum for local use
const LOCAL_MAINTENANCE_FREQUENCY = {
  DAILY: MaintenanceFrequency.DAILY,
  WEEKLY: MaintenanceFrequency.WEEKLY,
  MONTHLY: MaintenanceFrequency.MONTHLY,
  QUARTERLY: MaintenanceFrequency.QUARTERLY,
  BIANNUAL: MaintenanceFrequency.BIANNUAL,
  YEARLY: MaintenanceFrequency.YEARLY
};

export default function Assets() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isAdmin } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local state management
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any | null>(null);

  // Use our modular hooks
  const {
    assetsQuery,
    createAssetMutation,
    updateAssetMutation,
    deleteAssetMutation,
    importAssetsMutation,
    exportAssetsMutation
  } = useAssets();

  const {
    schedulesQuery,
    createScheduleMutation,
    deleteScheduleMutation
  } = useMaintenanceSchedules();

  // Forms
  const assetFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    location: z.string().optional(),
    category: z.string().min(1, "Category is required"),
    status: z.string().default(AssetStatus.OPERATIONAL),
    manufacturer: z.string().optional().nullable(),
    modelNumber: z.string().optional().nullable(),
    serialNumber: z.string().optional().nullable(),
    purchaseDate: z.date().optional().nullable(),
    purchaseCost: z.number().optional().nullable(),
    currentValue: z.number().optional().nullable(),
    lifeExpectancy: z.number().optional().nullable(),
    commissionedDate: z.date().optional().nullable(),
    lastMaintenance: z.date().optional().nullable(),
    nextMaintenance: z.date().optional().nullable(),
  });

  const maintenanceFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    status: z.string(),
    description: z.string().optional(),
    frequency: z.string(),
    startDate: z.date(),
    endDate: z.date().nullable(),
    affectsAssetStatus: z.boolean().default(false),
  });

  // Create form
  const form = useForm<z.infer<typeof assetFormSchema>>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      category: LOCAL_ASSET_CATEGORY.MACHINERY,
      status: AssetStatus.OPERATIONAL,
      manufacturer: "",
      modelNumber: "",
      serialNumber: "",
    },
  });

  // Details form
  const detailsForm = useForm<z.infer<typeof assetFormSchema>>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      category: LOCAL_ASSET_CATEGORY.MACHINERY,
      status: AssetStatus.OPERATIONAL,
      manufacturer: "",
      modelNumber: "",
      serialNumber: "",
    },
  });

  // Maintenance form
  const maintenanceForm = useForm<z.infer<typeof maintenanceFormSchema>>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "SCHEDULED",
      frequency: LOCAL_MAINTENANCE_FREQUENCY.MONTHLY,
      startDate: new Date(),
      endDate: null,
      affectsAssetStatus: false,
    },
  });

  // Update details form when asset is selected
  useEffect(() => {
    if (selectedAsset) {
      detailsForm.reset({
        ...selectedAsset,
        purchaseDate: selectedAsset.purchaseDate ? new Date(selectedAsset.purchaseDate) : null,
        commissionedDate: selectedAsset.commissionedDate ? new Date(selectedAsset.commissionedDate) : null,
        lastMaintenance: selectedAsset.lastMaintenance ? new Date(selectedAsset.lastMaintenance) : null,
        nextMaintenance: selectedAsset.nextMaintenance ? new Date(selectedAsset.nextMaintenance) : null,
      });
    }
  }, [selectedAsset, detailsForm]);

  // Set asset ID in maintenance form when dialog opens
  useEffect(() => {
    if (isMaintenanceDialogOpen && selectedAsset) {
      maintenanceForm.setValue("startDate", new Date());
    }
  }, [isMaintenanceDialogOpen, selectedAsset, maintenanceForm]);

  // Handler functions
  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDetailsDialogOpen(true);
  };

  const handleCreateSubmit = (data: z.infer<typeof assetFormSchema>) => {
    createAssetMutation.mutate(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        form.reset();
        toast({
          title: "Success",
          description: "Asset created successfully",
        });
      }
    });
  };

  const handleUpdateSubmit = (data: z.infer<typeof assetFormSchema>) => {
    if (!selectedAsset) return;
    
    updateAssetMutation.mutate({
      id: selectedAsset.id,
      updates: data
    }, {
      onSuccess: () => {
        setIsDetailsDialogOpen(false);
        toast({
          title: "Success",
          description: "Asset updated successfully",
        });
      }
    });
  };

  const handleDeleteAsset = () => {
    if (!selectedAsset) return;
    
    deleteAssetMutation.mutate(selectedAsset.id, {
      onSuccess: () => {
        setIsDetailsDialogOpen(false);
        toast({
          title: "Success",
          description: "Asset deleted successfully",
        });
      }
    });
  };

  const handleMaintenanceSubmit = (data: z.infer<typeof maintenanceFormSchema>) => {
    if (!selectedAsset) return;
    
    const schedule = {
      ...data,
      assetId: selectedAsset.id,
    };
    
    createScheduleMutation.mutate(schedule, {
      onSuccess: () => {
        setIsMaintenanceDialogOpen(false);
        maintenanceForm.reset({
          title: "",
          description: "",
          status: "SCHEDULED",
          frequency: LOCAL_MAINTENANCE_FREQUENCY.MONTHLY,
          startDate: new Date(),
          endDate: null,
          affectsAssetStatus: false,
        });
        toast({
          title: "Success",
          description: "Maintenance schedule created successfully",
        });
      }
    });
  };

  const handleDeleteSchedule = (scheduleId: number) => {
    deleteScheduleMutation.mutate(scheduleId, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Maintenance schedule deleted successfully",
        });
      }
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setIsImportDialogOpen(true);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    
    const formData = new FormData();
    formData.append('file', importFile);
    
    setIsImporting(true);
    
    importAssetsMutation.mutate(formData, {
      onSuccess: (data) => {
        setImportResults(data);
        setIsImporting(false);
        toast({
          title: "Success",
          description: `Imported ${data.successfulImports} of ${data.totalRows} assets`,
        });
      },
      onError: (error) => {
        setIsImporting(false);
        toast({
          title: "Import Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleExportClick = async () => {
    exportAssetsMutation.mutate(null, {
      onSuccess: (data) => {
        // Create a blob from the data
        const blob = new Blob([data], { type: "text/csv" });
        
        // Create a link and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `assets-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Success",
          description: "Assets exported successfully",
        });
      },
      onError: (error) => {
        toast({
          title: "Export Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  // Filter maintenance schedules for the selected asset
  const getAssetMaintenanceSchedules = (assetId: number) => {
    if (!Array.isArray(schedulesQuery.data)) return [];
    return schedulesQuery.data.filter(schedule => schedule.assetId === assetId);
  };

  // Configure mobile card view fields
  const cardFields: DataField[] = [
    {
      label: "Name",
      value: "",
      type: "text"
    },
    {
      label: "Category",
      value: "",
      type: "text"
    },
    {
      label: "Status",
      value: "",
      type: "badge"
    },
    {
      label: "Location",
      value: "",
      type: "text"
    }
  ];

  // Generate card data for mobile view
  const getAssetCardData = (assets: Asset[] | undefined) => {
    if (!Array.isArray(assets) || assets.length === 0) {
      return [];
    }
    
    return assets.map(asset => ({
      id: asset.id,
      fields: [
        {
          label: "Name",
          value: asset.name,
          type: "text"
        },
        {
          label: "Category",
          value: asset.category,
          type: "text"
        },
        {
          label: "Status",
          value: asset.status,
          type: "badge",
          badgeVariant: 
            asset.status === AssetStatus.OPERATIONAL 
              ? "default" 
              : asset.status === AssetStatus.NEEDS_MAINTENANCE 
                ? "secondary" 
                : "destructive"
        },
        {
          label: "Location",
          value: asset.location || "N/A",
          type: "text"
        }
      ]
    }));
  };

  // Render function for the asset list
  const renderAssetList = () => {
    if (!Array.isArray(assetsQuery.data) || assetsQuery.data.length === 0) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          No assets found. Create your first asset to get started.
        </div>
      );
    }

    return isMobile ? (
      <DataCardView
        data={getAssetCardData(assetsQuery.data)}
        fields={cardFields}
        keyField="id"
        onRowClick={(asset) => handleAssetClick(asset as Asset)}
        isLoading={assetsQuery.isLoading}
        emptyMessage="No assets found. Create one to get started."
      />
    ) : (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last Maintenance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assetsQuery.data.map((asset) => (
              <TableRow
                key={asset.id}
                className="cursor-pointer hover:bg-accent/50"
                onClick={() => handleAssetClick(asset)}
              >
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>{asset.category}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      asset.status === AssetStatus.OPERATIONAL
                        ? "default"
                        : asset.status === AssetStatus.NEEDS_MAINTENANCE
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {asset.status}
                  </Badge>
                </TableCell>
                <TableCell>{asset.location || "—"}</TableCell>
                <TableCell>
                  {asset.lastMaintenance
                    ? format(new Date(asset.lastMaintenance), "MMM dd, yyyy")
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Render the main content
  const renderContent = () => {
    return (
      <div className="flex-1 px-4 py-6 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <ToyBrick className="h-6 w-6 sm:h-7 sm:w-7" />
                Assets
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Manage and track your equipment and machinery
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size={isMobile ? "icon-lg" : "icon"}
                  onClick={handleExportClick}
                  disabled={!Array.isArray(assetsQuery.data) || assetsQuery.data.length === 0}
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Export</span>
                </Button>
                <Button
                  variant="outline"
                  size={isMobile ? "icon-lg" : "icon"}
                  onClick={handleImportClick}
                >
                  <UploadCloud className="h-4 w-4" />
                  <span className="sr-only">Import</span>
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
              </div>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="w-full sm:w-auto"
                size={isMobile ? "lg" : "default"}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </div>
          </div>

          {renderAssetList()}

          {/* Create Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-md sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
                <DialogDescription>
                  Enter the details of the asset you want to add to the system.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
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
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={LOCAL_ASSET_CATEGORY.MACHINERY}>Machinery</SelectItem>
                              <SelectItem value={LOCAL_ASSET_CATEGORY.VEHICLE}>Vehicle</SelectItem>
                              <SelectItem value={LOCAL_ASSET_CATEGORY.TOOL}>Tool</SelectItem>
                              <SelectItem value={LOCAL_ASSET_CATEGORY.COMPUTER}>Computer</SelectItem>
                              <SelectItem value={LOCAL_ASSET_CATEGORY.OTHER}>Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={AssetStatus.OPERATIONAL}>Operational</SelectItem>
                              <SelectItem value={AssetStatus.NEEDS_MAINTENANCE}>Needs Maintenance</SelectItem>
                              <SelectItem value={AssetStatus.OUT_OF_SERVICE}>Out of Service</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturer</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} />
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
                            <Input {...field} value={field.value || ""} />
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
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-3 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createAssetMutation.isPending}>
                      {createAssetMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Asset'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Details Dialog */}
          {selectedAsset && (
            <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Asset Details</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance Schedules</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details">
                    <Form {...detailsForm}>
                      <form onSubmit={detailsForm.handleSubmit(handleUpdateSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={detailsForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={detailsForm.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value={LOCAL_ASSET_CATEGORY.MACHINERY}>Machinery</SelectItem>
                                    <SelectItem value={LOCAL_ASSET_CATEGORY.VEHICLE}>Vehicle</SelectItem>
                                    <SelectItem value={LOCAL_ASSET_CATEGORY.TOOL}>Tool</SelectItem>
                                    <SelectItem value={LOCAL_ASSET_CATEGORY.COMPUTER}>Computer</SelectItem>
                                    <SelectItem value={LOCAL_ASSET_CATEGORY.OTHER}>Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={detailsForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={detailsForm.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={detailsForm.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value={AssetStatus.OPERATIONAL}>Operational</SelectItem>
                                    <SelectItem value={AssetStatus.NEEDS_MAINTENANCE}>Needs Maintenance</SelectItem>
                                    <SelectItem value={AssetStatus.OUT_OF_SERVICE}>Out of Service</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={detailsForm.control}
                            name="manufacturer"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Manufacturer</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={detailsForm.control}
                            name="modelNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Model Number</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={detailsForm.control}
                          name="serialNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Serial Number</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="pt-6 flex justify-between">
                          <div>
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="destructive">Delete Asset</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the asset
                                      and all related maintenance schedules.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAsset}>
                                      {deleteAssetMutation.isPending ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Deleting...
                                        </>
                                      ) : (
                                        'Delete'
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={updateAssetMutation.isPending}>
                              {updateAssetMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                'Save Changes'
                              )}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </Form>
                  </TabsContent>
                  <TabsContent value="maintenance">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Maintenance Schedules</h3>
                        <Button onClick={() => setIsMaintenanceDialogOpen(true)}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Schedule
                        </Button>
                      </div>
                      {Array.isArray(schedulesQuery.data) && selectedAsset && (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getAssetMaintenanceSchedules(selectedAsset.id).length > 0 ? (
                                getAssetMaintenanceSchedules(selectedAsset.id).map((schedule) => (
                                  <TableRow key={schedule.id}>
                                    <TableCell className="font-medium">{schedule.title}</TableCell>
                                    <TableCell>{schedule.frequency}</TableCell>
                                    <TableCell>
                                      {format(new Date(schedule.startDate), "MMM dd, yyyy")}
                                    </TableCell>
                                    <TableCell>
                                      <Badge>{schedule.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {isAdmin && (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                              <svg 
                                                xmlns="http://www.w3.org/2000/svg" 
                                                width="24" 
                                                height="24" 
                                                viewBox="0 0 24 24" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                strokeWidth="2" 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round" 
                                                className="h-4 w-4"
                                              >
                                                <path d="M3 6h18"></path>
                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                              </svg>
                                              <span className="sr-only">Delete</span>
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Maintenance Schedule</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to delete this maintenance schedule?
                                                This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteSchedule(schedule.id)}>
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                    No maintenance schedules for this asset
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          )}

          {/* Maintenance Dialog */}
          {selectedAsset && (
            <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Maintenance Schedule</DialogTitle>
                  <DialogDescription>
                    Set up a regular maintenance schedule for {selectedAsset.name}
                  </DialogDescription>
                </DialogHeader>
                <Form {...maintenanceForm}>
                  <form onSubmit={maintenanceForm.handleSubmit(handleMaintenanceSubmit)} className="space-y-4">
                    <FormField
                      control={maintenanceForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title *</FormLabel>
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
                          <FormLabel>Frequency *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={LOCAL_MAINTENANCE_FREQUENCY.DAILY}>Daily</SelectItem>
                              <SelectItem value={LOCAL_MAINTENANCE_FREQUENCY.WEEKLY}>Weekly</SelectItem>
                              <SelectItem value={LOCAL_MAINTENANCE_FREQUENCY.MONTHLY}>Monthly</SelectItem>
                              <SelectItem value={LOCAL_MAINTENANCE_FREQUENCY.QUARTERLY}>Quarterly</SelectItem>
                              <SelectItem value={LOCAL_MAINTENANCE_FREQUENCY.BIANNUAL}>Semi-Annually</SelectItem>
                              <SelectItem value={LOCAL_MAINTENANCE_FREQUENCY.YEARLY}>Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={maintenanceForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date *</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                              onChange={(e) => {
                                const date = e.target.value
                                  ? new Date(e.target.value)
                                  : new Date();
                                field.onChange(date);
                              }}
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
                              value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                              onChange={(e) => {
                                const date = e.target.value
                                  ? new Date(e.target.value)
                                  : null;
                                field.onChange(date);
                              }}
                            />
                          </FormControl>
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
                            <FormLabel>
                              Update Asset Status
                            </FormLabel>
                            <FormDescription>
                              When overdue, set asset status to "Needs Maintenance"
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <div className="pt-3 flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsMaintenanceDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createScheduleMutation.isPending}>
                        {createScheduleMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Schedule'
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}

          {/* Import Dialog */}
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Import Assets</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to import assets into the system.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {importFile && (
                  <div className="border rounded-md p-4">
                    <p className="text-sm font-medium">Selected File:</p>
                    <p className="text-sm">{importFile.name}</p>
                  </div>
                )}
                {importResults && (
                  <div className="border rounded-md p-4 space-y-2">
                    <p className="text-sm font-medium">Import Results:</p>
                    <p className="text-sm">Total Rows: {importResults.totalRows}</p>
                    <p className="text-sm">Successful Imports: {importResults.successfulImports}</p>
                    <p className="text-sm">Failed Imports: {importResults.failedImports}</p>
                    {importResults.errors && importResults.errors.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-destructive">Errors:</p>
                        <ul className="text-xs space-y-1 text-destructive">
                          {importResults.errors.slice(0, 5).map((error: any, i: number) => (
                            <li key={i}>Row {error.row}: {error.error}</li>
                          ))}
                          {importResults.errors.length > 5 && (
                            <li>...and {importResults.errors.length - 5} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <div className="pt-3 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsImportDialogOpen(false);
                    setImportFile(null);
                    setImportResults(null);
                  }}>
                    {importResults ? 'Close' : 'Cancel'}
                  </Button>
                  {!importResults && (
                    <Button
                      onClick={handleImportSubmit}
                      disabled={!importFile || isImporting}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Import'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  };

  // Use MultiQueryLoader to handle loading states for all queries
  return (
    <MultiQueryLoader
      queries={[assetsQuery, schedulesQuery]}
      loadingComponent={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      {renderContent()}
    </MultiQueryLoader>
  );
}