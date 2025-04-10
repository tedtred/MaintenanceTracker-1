import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProblemButton, WorkOrderPriority, Asset, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HexColorPicker } from "react-colorful";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, BarChart2, CheckCircle, ClipboardList, Edit, Paintbrush, Plus, RefreshCw, Save, Trash2, Wrench, X } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

const buttonFormSchema = z.object({
  label: z.string().min(2, "Label must be at least 2 characters").max(50, "Label must be less than 50 characters"),
  color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Must be a valid hex color code"),
  icon: z.string().optional(),
  active: z.boolean().default(true),
  
  // Work order integration
  createWorkOrder: z.boolean().default(false),
  workOrderTitle: z.string().optional(),
  workOrderDescription: z.string().optional(),
  workOrderPriority: z.string().optional(),
  defaultAssetId: z.number().nullable().optional(),
  notifyMaintenance: z.boolean().default(false),
});

type ButtonFormData = z.infer<typeof buttonFormSchema>;

export default function ProblemTrackingAdmin() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedButton, setSelectedButton] = useState<ProblemButton | null>(null);
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const [selectedEditColor, setSelectedEditColor] = useState("#3B82F6");
  
  // Query for problem buttons
  const { data: buttons = [], isLoading } = useQuery<ProblemButton[]>({
    queryKey: ["/api/problem-buttons"],
  });
  
  // Query for assets (for work order integration)
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });
  
  // Handle create button mutation
  const createMutation = useMutation({
    mutationFn: async (data: ButtonFormData) => {
      const response = await apiRequest("POST", "/api/problem-buttons", data);
      const button = await response.json();
      return button;
    },
    onSuccess: () => {
      toast({
        title: "Button created",
        description: "The problem button has been created successfully"
      });
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/problem-buttons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle update button mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: ButtonFormData }) => {
      const response = await apiRequest("PATCH", `/api/problem-buttons/${id}`, data);
      const button = await response.json();
      return button;
    },
    onSuccess: () => {
      toast({
        title: "Button updated",
        description: "The problem button has been updated successfully"
      });
      setIsEditOpen(false);
      setSelectedButton(null);
      queryClient.invalidateQueries({ queryKey: ["/api/problem-buttons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle delete button mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/problem-buttons/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Button deleted",
        description: "The problem button has been deleted successfully"
      });
      setIsEditOpen(false);
      setSelectedButton(null);
      queryClient.invalidateQueries({ queryKey: ["/api/problem-buttons"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create button form setup
  const createForm = useForm<ButtonFormData>({
    resolver: zodResolver(buttonFormSchema),
    defaultValues: {
      label: "",
      color: "#3B82F6",
      icon: "AlertTriangle",
      active: true,
      createWorkOrder: false,
      workOrderTitle: "",
      workOrderDescription: "",
      workOrderPriority: "MEDIUM",
      defaultAssetId: null,
      notifyMaintenance: false,
    },
  });
  
  // Edit button form setup
  const editForm = useForm<ButtonFormData>({
    resolver: zodResolver(buttonFormSchema),
    defaultValues: {
      label: "",
      color: "#3B82F6",
      icon: "AlertTriangle",
      active: true,
      createWorkOrder: false,
      workOrderTitle: "",
      workOrderDescription: "",
      workOrderPriority: "MEDIUM",
      defaultAssetId: null,
      notifyMaintenance: false,
    },
  });
  
  // Handle opening the edit dialog
  const handleEditButton = (button: ProblemButton) => {
    setSelectedButton(button);
    setSelectedEditColor(button.color);
    
    editForm.reset({
      label: button.label,
      color: button.color,
      icon: button.icon || undefined,
      active: button.active,
      createWorkOrder: button.createWorkOrder || false,
      workOrderTitle: button.workOrderTitle || "",
      workOrderDescription: button.workOrderDescription || "",
      workOrderPriority: button.workOrderPriority || "MEDIUM",
      defaultAssetId: button.defaultAssetId,
      notifyMaintenance: button.notifyMaintenance || false,
    });
    
    setIsEditOpen(true);
  };
  
  // Handle creating a new button
  const handleCreateButton = (data: ButtonFormData) => {
    createMutation.mutate(data);
  };
  
  // Handle updating a button
  const handleEditButtonSubmit = (data: ButtonFormData) => {
    if (selectedButton) {
      updateMutation.mutate({ id: selectedButton.id, data });
    }
  };
  
  // Handle deleting a button
  const handleDeleteButton = () => {
    if (selectedButton) {
      deleteMutation.mutate(selectedButton.id);
    }
  };
  
  // Handle color change in create form
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    createForm.setValue("color", color, { shouldValidate: true });
  };
  
  // Handle color change in edit form
  const handleEditColorChange = (color: string) => {
    setSelectedEditColor(color);
    editForm.setValue("color", color, { shouldValidate: true });
  };
  
  // Open the create dialog
  const openCreateDialog = () => {
    createForm.reset({
      label: "",
      color: "#3B82F6",
      icon: "AlertTriangle",
      active: true,
      createWorkOrder: false,
      workOrderTitle: "",
      workOrderDescription: "",
      workOrderPriority: "MEDIUM",
      defaultAssetId: null,
      notifyMaintenance: false,
    });
    setSelectedColor("#3B82F6");
    setIsCreateOpen(true);
  };
  
  // Function to get appropriate icon component
  const getIconComponent = (iconName?: string, className = "h-5 w-5") => {
    switch (iconName) {
      case "AlertTriangle":
        return <AlertTriangle className={className} />;
      case "Wrench":
        return <Wrench className={className} />;
      case "BarChart2":
        return <BarChart2 className={className} />;
      default:
        return <AlertTriangle className={className} />;
    }
  };
  
  return (
    <div className="w-full">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Problem Button Configuration</h1>
            <p className="text-muted-foreground">
              Manage problem reporting buttons and work order integration
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Button
          </Button>
        </div>
        
        {/* Button List */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {buttons.map((button) => (
            <Card key={button.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: button.color + "20" }}>
                      <span style={{ color: button.color }}>
                        {getIconComponent(button.icon)}
                      </span>
                    </span>
                    {button.label}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => handleEditButton(button)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  {button.active ? (
                    <span className="flex items-center text-xs text-green-500">
                      <CheckCircle className="mr-1 h-3 w-3" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center text-xs text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <div className="h-2" style={{ backgroundColor: button.color }}></div>
              <CardContent className="pt-4 space-y-2">
                {button.createWorkOrder && (
                  <div className="text-sm">
                    <p className="flex items-center text-muted-foreground">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Creates work order on report
                    </p>
                    {button.workOrderPriority && (
                      <p className="text-xs ml-6 mt-1 text-muted-foreground">
                        Priority: {button.workOrderPriority}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Create Button Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Create Problem Button</DialogTitle>
            <DialogDescription>
              Configure a new button for problem reporting
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateButton)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Label</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Machine Failure" {...field} />
                      </FormControl>
                      <FormDescription>
                        Choose a clear and concise label for the problem button
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Color</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-10 w-10 rounded-md border"
                              style={{ backgroundColor: selectedColor }}
                            />
                            <Input
                              {...field}
                              value={selectedColor}
                              onChange={(e) => handleColorChange(e.target.value)}
                            />
                          </div>
                          <HexColorPicker
                            color={selectedColor}
                            onChange={handleColorChange}
                            className="w-full"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AlertTriangle">
                            <div className="flex items-center">
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Alert Triangle
                            </div>
                          </SelectItem>
                          <SelectItem value="Wrench">
                            <div className="flex items-center">
                              <Wrench className="mr-2 h-4 w-4" />
                              Wrench
                            </div>
                          </SelectItem>
                          <SelectItem value="BarChart2">
                            <div className="flex items-center">
                              <BarChart2 className="mr-2 h-4 w-4" />
                              Chart
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose an icon that visually represents the problem type
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Only active buttons will be shown on the problem reporting page
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
                  control={createForm.control}
                  name="createWorkOrder"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Create Work Order</FormLabel>
                        <FormDescription>
                          Automatically create a work order when this problem is reported
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
                
                {createForm.watch("createWorkOrder") && (
                  <>
                    <FormField
                      control={createForm.control}
                      name="workOrderTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Order Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., [Button] repair needed" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Default title for created work orders. Use [button] to include button label.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="workOrderDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Order Description Template</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="e.g., Issue reported at [location]. Details: [notes]" 
                              {...field} 
                              className="min-h-24"
                            />
                          </FormControl>
                          <FormDescription>
                            Use [asset], [location], and [notes] to include details automatically
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="workOrderPriority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Priority</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(WorkOrderPriority).map((priority) => (
                                <SelectItem key={priority} value={priority}>
                                  {priority}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="defaultAssetId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Asset (Optional)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an asset" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {assets.map((asset) => (
                                <SelectItem key={asset.id} value={asset.id.toString()}>
                                  {asset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            User can override this when reporting
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="notifyMaintenance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Notify Maintenance Team</FormLabel>
                            <FormDescription>
                              Send notification to maintenance team when work order is created
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
                  </>
                )}
              </form>
            </Form>
          </ScrollArea>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={createForm.handleSubmit(handleCreateButton)}
              disabled={createMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {createMutation.isPending ? "Creating..." : "Create Button"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Button Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Edit Problem Button</DialogTitle>
            <DialogDescription>
              Modify button settings and work order integration
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditButtonSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Label</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Machine Failure" {...field} />
                      </FormControl>
                      <FormDescription>
                        Choose a clear and concise label for the problem button
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Color</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-10 w-10 rounded-md border"
                              style={{ backgroundColor: selectedEditColor }}
                            />
                            <Input
                              {...field}
                              value={selectedEditColor}
                              onChange={(e) => handleEditColorChange(e.target.value)}
                            />
                          </div>
                          <HexColorPicker
                            color={selectedEditColor}
                            onChange={handleEditColorChange}
                            className="w-full"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AlertTriangle">
                            <div className="flex items-center">
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Alert Triangle
                            </div>
                          </SelectItem>
                          <SelectItem value="Wrench">
                            <div className="flex items-center">
                              <Wrench className="mr-2 h-4 w-4" />
                              Wrench
                            </div>
                          </SelectItem>
                          <SelectItem value="BarChart2">
                            <div className="flex items-center">
                              <BarChart2 className="mr-2 h-4 w-4" />
                              Chart
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose an icon that visually represents the problem type
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Only active buttons will be shown on the problem reporting page
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
                  control={editForm.control}
                  name="createWorkOrder"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Create Work Order</FormLabel>
                        <FormDescription>
                          Automatically create a work order when this problem is reported
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
                
                {editForm.watch("createWorkOrder") && (
                  <>
                    <FormField
                      control={editForm.control}
                      name="workOrderTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Order Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., [Button] repair needed" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Default title for created work orders. Use [button] to include button label.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="workOrderDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Order Description Template</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="e.g., Issue reported at [location]. Details: [notes]" 
                              {...field} 
                              className="min-h-24"
                            />
                          </FormControl>
                          <FormDescription>
                            Use [asset], [location], and [notes] to include details automatically
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="workOrderPriority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Priority</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(WorkOrderPriority).map((priority) => (
                                <SelectItem key={priority} value={priority}>
                                  {priority}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="defaultAssetId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Asset (Optional)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an asset" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {assets.map((asset) => (
                                <SelectItem key={asset.id} value={asset.id.toString()}>
                                  {asset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            User can override this when reporting
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="notifyMaintenance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Notify Maintenance Team</FormLabel>
                            <FormDescription>
                              Send notification to maintenance team when work order is created
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
                  </>
                )}
              </form>
            </Form>
          </ScrollArea>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={editForm.handleSubmit(handleEditButtonSubmit)}
              disabled={updateMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Button Dialog */}
      {selectedButton && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              size="sm"
              className="absolute top-4 right-20"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Problem Button</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this problem button? This action cannot be undone.
                Any existing problem reports using this button will be kept, but new reports cannot be created.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteButton}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}