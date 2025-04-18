import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { WorkOrder, InsertWorkOrder, WorkOrderStatus, WorkOrderPriority } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { insertWorkOrderSchema } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { Switch } from "@/components/ui/switch";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  Loader2, 
  Archive, 
  Trash2, 
  ClipboardList, 
  ArrowRight,
  Filter,
  PlusCircle,
  CalendarClock
} from "lucide-react";
import { DataCardView, DataField } from "@/components/ui/data-card-view";
import { useLocation } from "wouter";

export default function WorkOrders() {
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();

  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  // Filter work orders based on archived status
  const filteredWorkOrders = Array.isArray(workOrders) ? workOrders.filter((wo) =>
    showArchived ? true : wo.status !== WorkOrderStatus.ARCHIVED
  ) : [];

  const createMutation = useMutation({
    mutationFn: async (data: InsertWorkOrder) => {
      try {
        console.log("Creating work order with data:", data);
        
        // Set a default dueDate (24 hours from now) if not provided
        if (!data.dueDate) {
          const tomorrow = new Date();
          tomorrow.setHours(tomorrow.getHours() + 24);
          data.dueDate = tomorrow;
        }
        
        // Ensure proper date formatting
        const payload = {
          ...data,
          assignedTo: null,
          assetId: null,
          reportedDate: data.reportedDate ? new Date(data.reportedDate).toISOString() : new Date().toISOString(),
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : new Date(Date.now() + 86400000).toISOString(), // 24 hours in ms
          completedDate: null,
        };
        
        console.log("Formatted payload:", payload);
        
        const res = await apiRequest("POST", "/api/work-orders", payload);
        if (!res.ok) {
          const errorData = await res.json();
          console.error("API error response:", errorData);
          throw new Error(errorData.message || `Failed to create work order: ${res.statusText}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error("Error creating work order:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Work order created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Work order created successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Create mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create work order",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<WorkOrder> & { id: number }) => {
      const { id, reportedDate, completedDate, ...otherUpdates } = data;
      
      // Format dates properly for API
      const updates = {
        ...otherUpdates,
        reportedDate: reportedDate ? new Date(reportedDate).toISOString() : undefined,
        completedDate: completedDate ? new Date(completedDate).toISOString() : null,
      };
      
      console.log("Updating work order with data:", { id, updates });
      
      try {
        const res = await apiRequest("PATCH", `/api/work-orders/${id}`, updates);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Failed to update work order: ${res.statusText}`);
        }
        return await res.json();
      } catch (error) {
        console.error("Error updating work order:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setIsDetailsDialogOpen(false);
      toast({
        title: "Success",
        description: "Work order updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Update mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update work order",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/work-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setIsDetailsDialogOpen(false);
      toast({
        title: "Success",
        description: "Work order deleted successfully",
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

  const form = useForm<InsertWorkOrder>({
    resolver: zodResolver(insertWorkOrderSchema),
    defaultValues: {
      title: "",
      description: "",
      status: WorkOrderStatus.OPEN,
      priority: WorkOrderPriority.MEDIUM,
      reportedDate: new Date(),
      completedDate: null,
      assignedTo: null,
      assetId: null,
      dueDate: null,
      affectsAssetStatus: false,
      partsRequired: "",
      problemDetails: "",
      solutionNotes: "",
    },
  });

  const detailsForm = useForm<WorkOrder>({
    defaultValues: selectedWorkOrder ? {
      ...selectedWorkOrder,
      reportedDate: new Date(selectedWorkOrder.reportedDate),
      completedDate: selectedWorkOrder.completedDate ? new Date(selectedWorkOrder.completedDate) : null,
    } : {
      id: 0,
      title: "",
      description: "",
      status: WorkOrderStatus.OPEN,
      priority: WorkOrderPriority.MEDIUM,
      reportedDate: new Date(),
      completedDate: null,
      assignedTo: null,
      assetId: null,
    },
  });

  useEffect(() => {
    if (selectedWorkOrder) {
      // Format dates properly when resetting the form
      detailsForm.reset({
        ...selectedWorkOrder,
        reportedDate: new Date(selectedWorkOrder.reportedDate),
        completedDate: selectedWorkOrder.completedDate ? new Date(selectedWorkOrder.completedDate) : null,
        // Add any other date fields that need conversion
      });
    }
  }, [selectedWorkOrder, detailsForm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // Configure mobile card fields
  const cardFields: DataField[] = [
    {
      label: "Title",
      value: "",
      type: "text"
    },
    {
      label: "Status",
      value: "",
      type: "badge"
    },
    {
      label: "Priority",
      value: "",
      type: "badge"
    },
    {
      label: "Reported",
      value: "",
      type: "text"
    }
  ];
  
  // Generate card data for each work order
  const getWorkOrderCardData = (workOrders: WorkOrder[]) => {
    // Log the incoming data to debug
    console.log("Work orders for mobile view:", workOrders);
    
    if (!Array.isArray(workOrders) || workOrders.length === 0) {
      return [];
    }
    
    return workOrders.map(wo => {
      if (!wo) {
        console.error("Invalid work order object:", wo);
        return {
          id: 0,
          fields: cardFields
        };
      }
      
      return {
        id: wo.id,
        fields: [
          {
            label: "Title",
            value: wo.title || "No title",
            type: "text"
          },
          {
            label: "Status",
            value: wo.status || "Unknown",
            type: "badge",
            badgeVariant: 
              wo.status === WorkOrderStatus.COMPLETED 
                ? "default" 
                : wo.status === WorkOrderStatus.IN_PROGRESS 
                  ? "secondary" 
                  : wo.status === WorkOrderStatus.OPEN 
                    ? "outline"
                    : "destructive"
          },
          {
            label: "Priority",
            value: wo.priority || "Unknown",
            type: "badge",
            badgeVariant: 
              wo.priority === WorkOrderPriority.HIGH 
                ? "destructive" 
                : wo.priority === WorkOrderPriority.MEDIUM 
                  ? "secondary"
                  : "outline"
          },
          {
            label: "Reported",
            value: wo.reportedDate ? new Date(wo.reportedDate).toLocaleString() : "Unknown",
            type: "text"
          }
        ]
      };
    });
  };
  
  const handleWorkOrderClick = (workOrder: WorkOrder) => {
    // For now, for both mobile and desktop, show the dialog
    setSelectedWorkOrder(workOrder);
    setIsDetailsDialogOpen(true);
  };

  return (
    <div className="flex-1 px-4 py-6 sm:p-8 mb-16 sm:mb-0">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 sm:h-7 sm:w-7" />
              Work Orders
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage and track maintenance tasks
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={showArchived}
                onCheckedChange={setShowArchived}
                className="data-[state=checked]:bg-primary"
              />
              <span className="text-sm flex items-center gap-1">
                <Archive className="h-4 w-4" />
                Show Archived
              </span>
            </div>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="w-full sm:w-auto"
              size={isMobile ? "lg" : "default"}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Work Order
            </Button>
          </div>
        </div>

        {/* Mobile Card View */}
        {isMobile ? (
          <DataCardView
            data={getWorkOrderCardData(filteredWorkOrders)}
            fields={cardFields}
            keyField="id"
            onRowClick={handleWorkOrderClick}
            isLoading={isLoading}
            emptyMessage="No work orders found. Create one to get started."
          />
        ) : (
          /* Desktop Table View */
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkOrders.map((wo) => (
                  <TableRow
                    key={wo.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => handleWorkOrderClick(wo)}
                  >
                    <TableCell className="font-medium">{wo.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          wo.priority === WorkOrderPriority.HIGH 
                            ? "destructive" 
                            : wo.priority === WorkOrderPriority.MEDIUM 
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {wo.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          wo.status === WorkOrderStatus.COMPLETED 
                            ? "default" 
                            : wo.status === WorkOrderStatus.IN_PROGRESS 
                              ? "secondary" 
                              : wo.status === WorkOrderStatus.OPEN 
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {wo.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(wo.reportedDate).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Work Order</DialogTitle>
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
                          {Object.values(WorkOrderStatus).map((status) => (
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
                  name="priority"
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
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          onChange={(e) => {
                            field.onChange(e.target.value ? new Date(e.target.value) : null);
                          }}
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
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
                  onClick={() => {
                    // Check form values before submission
                    console.log("Form values before submission:", form.getValues());
                    console.log("Form errors:", form.formState.errors);
                  }}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Work Order"
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>Work Order Details</DialogTitle>
                {selectedWorkOrder && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this work order and all its attachments.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(selectedWorkOrder.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </DialogHeader>
            {selectedWorkOrder && (
              <Form {...detailsForm}>
                <form
                  onSubmit={detailsForm.handleSubmit((data) =>
                    updateMutation.mutate({ ...data, id: selectedWorkOrder.id })
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={detailsForm.control}
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
                    control={detailsForm.control}
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
                    control={detailsForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(WorkOrderStatus).map((status) => (
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
                    control={detailsForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(WorkOrderPriority).map(
                              (priority) => (
                                <SelectItem key={priority} value={priority}>
                                  {priority}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="text-sm text-muted-foreground">
                    Reported on: {new Date(selectedWorkOrder?.reportedDate).toLocaleString()}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}