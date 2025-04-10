import { useState, useEffect } from "react";
import { WorkOrderStatus, WorkOrderPriority, InsertWorkOrder, WorkOrder } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { insertWorkOrderSchema } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";

// Import our modular data hooks
import { useWorkOrders } from "@/hooks/use-work-order-data";
import { DataLoader } from "@/components/data-loader";

// UI Components
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

export default function WorkOrders() {
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();

  // Use our modular hooks for data fetching and mutations
  const { 
    workOrdersQuery, 
    createWorkOrderMutation, 
    updateWorkOrderMutation, 
    deleteWorkOrderMutation 
  } = useWorkOrders();

  // Filter work orders based on archived status
  const getFilteredWorkOrders = (workOrders: WorkOrder[] | undefined) => {
    if (!Array.isArray(workOrders)) return [];
    
    return workOrders.filter((wo) =>
      showArchived ? true : wo.status !== WorkOrderStatus.ARCHIVED
    );
  };

  // Form for creating work orders
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

  // Form for updating work orders
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

  // Update the details form when a work order is selected
  useEffect(() => {
    if (selectedWorkOrder) {
      // Format dates properly when resetting the form
      detailsForm.reset({
        ...selectedWorkOrder,
        reportedDate: new Date(selectedWorkOrder.reportedDate),
        completedDate: selectedWorkOrder.completedDate ? new Date(selectedWorkOrder.completedDate) : null,
      });
    }
  }, [selectedWorkOrder, detailsForm]);

  // Handle submission of the create form
  const handleCreateSubmit = (data: InsertWorkOrder) => {
    // Set a default dueDate (24 hours from now) if not provided
    if (!data.dueDate) {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 24);
      data.dueDate = tomorrow;
    }
    
    // Format payload with proper dates
    const payload = {
      ...data,
      assignedTo: null,
      assetId: null,
      reportedDate: data.reportedDate ? new Date(data.reportedDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 86400000), // 24 hours in ms
      completedDate: null,
    };
    
    createWorkOrderMutation.mutate(payload, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        form.reset();
        toast({
          title: "Success",
          description: "Work order created successfully",
        });
      }
    });
  };

  // Handle submission of the update form
  const handleUpdateSubmit = (data: WorkOrder) => {
    // Format dates properly for API
    const updates = {
      ...data,
      reportedDate: data.reportedDate ? new Date(data.reportedDate) : undefined,
      completedDate: data.completedDate ? new Date(data.completedDate) : null,
    };
    
    updateWorkOrderMutation.mutate({ id: data.id, updates }, {
      onSuccess: () => {
        setIsDetailsDialogOpen(false);
        toast({
          title: "Success",
          description: "Work order updated successfully",
        });
      }
    });
  };

  // Handle deletion of a work order
  const handleDelete = (id: number) => {
    deleteWorkOrderMutation.mutate(id, {
      onSuccess: () => {
        setIsDetailsDialogOpen(false);
        toast({
          title: "Success",
          description: "Work order deleted successfully",
        });
      }
    });
  };
  
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
  
  // Generate card data for mobile view
  const getWorkOrderCardData = (workOrders: WorkOrder[]) => {
    if (!Array.isArray(workOrders) || workOrders.length === 0) {
      return [];
    }
    
    return workOrders.map(wo => {
      if (!wo) {
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
  
  // Handle clicking on a work order
  const handleWorkOrderClick = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setIsDetailsDialogOpen(true);
  };

  // Render the main content
  const renderContent = () => {
    const filteredWorkOrders = getFilteredWorkOrders(workOrdersQuery.data);
    
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
              isLoading={workOrdersQuery.isLoading}
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
                  onSubmit={form.handleSubmit(handleCreateSubmit)}
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
                            <SelectItem value={WorkOrderStatus.OPEN}>Open</SelectItem>
                            <SelectItem value={WorkOrderStatus.IN_PROGRESS}>In Progress</SelectItem>
                            <SelectItem value={WorkOrderStatus.COMPLETED}>Completed</SelectItem>
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
                            <SelectItem value={WorkOrderPriority.LOW}>Low</SelectItem>
                            <SelectItem value={WorkOrderPriority.MEDIUM}>Medium</SelectItem>
                            <SelectItem value={WorkOrderPriority.HIGH}>High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-3 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createWorkOrderMutation.isPending}>
                      {createWorkOrderMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Details Dialog */}
          {selectedWorkOrder && (
            <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
              <DialogContent className="max-w-md sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex justify-between items-center">
                    <span>Work Order Details</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/work-orders/${selectedWorkOrder.id}`)}
                      className="flex items-center gap-2"
                    >
                      Full View <ArrowRight className="h-4 w-4" />
                    </Button>
                  </DialogTitle>
                </DialogHeader>
                <Form {...detailsForm}>
                  <form
                    onSubmit={detailsForm.handleSubmit(handleUpdateSubmit)}
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
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={detailsForm.control}
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
                                <SelectItem value={WorkOrderStatus.OPEN}>Open</SelectItem>
                                <SelectItem value={WorkOrderStatus.IN_PROGRESS}>In Progress</SelectItem>
                                <SelectItem value={WorkOrderStatus.COMPLETED}>Completed</SelectItem>
                                <SelectItem value={WorkOrderStatus.ARCHIVED}>Archived</SelectItem>
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
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={WorkOrderPriority.LOW}>Low</SelectItem>
                                <SelectItem value={WorkOrderPriority.MEDIUM}>Medium</SelectItem>
                                <SelectItem value={WorkOrderPriority.HIGH}>High</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="pt-6 flex justify-between">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this
                              work order and all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(selectedWorkOrder.id)}>
                              {deleteWorkOrderMutation.isPending ? (
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
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateWorkOrderMutation.isPending}>
                          {updateWorkOrderMutation.isPending ? (
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
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    );
  };

  // Use DataLoader to handle loading states
  return (
    <DataLoader
      isLoading={workOrdersQuery.isLoading}
      isError={workOrdersQuery.isError}
      error={workOrdersQuery.error}
      data={workOrdersQuery.data}
      loadingComponent={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      {() => renderContent()}
    </DataLoader>
  );
}