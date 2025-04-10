import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { ProblemButton } from "@shared/schema";
import { HexColorPicker } from "react-colorful";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  AlertTriangle, 
  BarChart2, 
  CheckCircle, 
  ClipboardList, 
  Edit, 
  Loader2,
  Plus, 
  Trash2, 
  Wrench
} from "lucide-react";

// Import our modular hooks and components
import { 
  useProblemAdmin, 
  buttonFormSchema, 
  ButtonFormData 
} from "@/hooks/use-problem-admin-data";
import { DataLoader, MultiQueryLoader } from "@/components/data-loader";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

export default function ProblemTrackingAdminNew() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedButton, setSelectedButton] = useState<ProblemButton | null>(null);
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const [selectedEditColor, setSelectedEditColor] = useState("#3B82F6");
  
  // Use our modular hooks
  const {
    buttonsQuery,
    assetsQuery,
    usersQuery,
    createButtonMutation,
    updateButtonMutation,
    deleteButtonMutation,
  } = useProblemAdmin();
  
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
      defaultAssignedTo: null,
      notifyMaintenance: false,
      skipDetailsForm: false,
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
      defaultAssignedTo: null,
      notifyMaintenance: false,
      skipDetailsForm: false,
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
      defaultAssignedTo: button.defaultAssignedTo,
      notifyMaintenance: button.notifyMaintenance || false,
      skipDetailsForm: button.skipDetailsForm || false,
    });
    
    setIsEditOpen(true);
  };
  
  // Handle creating a new button
  const handleCreateButton = (data: ButtonFormData) => {
    createButtonMutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Button created",
          description: "The problem button has been created successfully"
        });
        setIsCreateOpen(false);
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };
  
  // Handle updating a button
  const handleEditButtonSubmit = (data: ButtonFormData) => {
    if (selectedButton) {
      updateButtonMutation.mutate({ id: selectedButton.id, data }, {
        onSuccess: () => {
          toast({
            title: "Button updated",
            description: "The problem button has been updated successfully"
          });
          setIsEditOpen(false);
          setSelectedButton(null);
        },
        onError: (error: Error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      });
    }
  };
  
  // Handle deleting a button
  const handleDeleteButton = () => {
    if (selectedButton) {
      deleteButtonMutation.mutate(selectedButton.id, {
        onSuccess: () => {
          toast({
            title: "Button deleted",
            description: "The problem button has been deleted successfully"
          });
          setIsEditOpen(false);
          setSelectedButton(null);
        },
        onError: (error: Error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      });
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
      defaultAssignedTo: null,
      notifyMaintenance: false,
      skipDetailsForm: false,
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
  
  // Render the main content
  const renderContent = () => {
    const buttons = Array.isArray(buttonsQuery.data) ? buttonsQuery.data : [];
    const assets = Array.isArray(assetsQuery.data) ? assetsQuery.data : [];
    const users = Array.isArray(usersQuery.data) ? usersQuery.data : [];
    
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Make this button available for problem reporting
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Create Work Order</FormLabel>
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
                    <div className="space-y-4 rounded-lg border p-4">
                      <h3 className="text-sm font-medium">Work Order Details</h3>
                      
                      <FormField
                        control={createForm.control}
                        name="workOrderTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Work Order Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Repair Machine Failure" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="workOrderDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Details about the work to be done"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="workOrderPriority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="LOW">Low</SelectItem>
                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                <SelectItem value="HIGH">High</SelectItem>
                                <SelectItem value="CRITICAL">Critical</SelectItem>
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
                            <FormLabel>Default Asset</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "none" ? null : value ? parseInt(value) : null)}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a default asset (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {assets.map(asset => (
                                  <SelectItem key={asset.id} value={asset.id.toString()}>
                                    {asset.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select a default asset for this problem type
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="defaultAssignedTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Assignee</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "none" ? null : value ? parseInt(value) : null)}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a default assignee (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {Array.isArray(usersQuery.data) && usersQuery.data.map(user => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select a default user to assign the work order to
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="notifyMaintenance"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Notify Maintenance</FormLabel>
                              <FormDescription>
                                Send notification to maintenance team
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
                        name="skipDetailsForm"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Skip Details Form</FormLabel>
                              <FormDescription>
                                Skip the details form when reporting this problem
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
                  )}
                </form>
              </Form>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                onClick={createForm.handleSubmit(handleCreateButton)} 
                disabled={createButtonMutation.isPending}
              >
                {createButtonMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Button'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Button Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => !open && setSelectedButton(null)}>
          <DialogContent className="sm:max-w-[500px] max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Edit Problem Button</DialogTitle>
              <DialogDescription>
                Update configuration for {selectedButton?.label}
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Make this button available for problem reporting
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Create Work Order</FormLabel>
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
                    <div className="space-y-4 rounded-lg border p-4">
                      <h3 className="text-sm font-medium">Work Order Details</h3>
                      
                      <FormField
                        control={editForm.control}
                        name="workOrderTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Work Order Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Repair Machine Failure" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="workOrderDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Details about the work to be done"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="workOrderPriority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="LOW">Low</SelectItem>
                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                <SelectItem value="HIGH">High</SelectItem>
                                <SelectItem value="CRITICAL">Critical</SelectItem>
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
                            <FormLabel>Default Asset</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "none" ? null : value ? parseInt(value) : null)}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a default asset (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {assets.map(asset => (
                                  <SelectItem key={asset.id} value={asset.id.toString()}>
                                    {asset.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select a default asset for this problem type
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="defaultAssignedTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Assignee</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "none" ? null : value ? parseInt(value) : null)}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a default assignee (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {Array.isArray(usersQuery.data) && usersQuery.data.map(user => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select a default user to assign the work order to
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="notifyMaintenance"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Notify Maintenance</FormLabel>
                              <FormDescription>
                                Send notification to maintenance team
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
                        name="skipDetailsForm"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Skip Details Form</FormLabel>
                              <FormDescription>
                                Skip the details form when reporting this problem
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
                  )}
                </form>
              </Form>
            </ScrollArea>
            <DialogFooter className="flex items-center justify-between sm:justify-between">
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={updateButtonMutation.isPending || deleteButtonMutation.isPending}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Problem Button</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this problem button? 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteButton}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  onClick={editForm.handleSubmit(handleEditButtonSubmit)} 
                  disabled={updateButtonMutation.isPending}
                >
                  {updateButtonMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };
  
  return (
    <MultiQueryLoader
      queries={[buttonsQuery, assetsQuery, usersQuery]}
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