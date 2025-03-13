import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { useQuery, useMutation } from "@tanstack/react-query";
import { WorkOrder, InsertWorkOrder, WorkOrderStatus, WorkOrderPriority } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { insertWorkOrderSchema } from "@shared/schema";
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
import { Loader2, Archive, Trash2 } from "lucide-react";

export default function WorkOrders() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();

  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  // Filter work orders based on archived status
  const filteredWorkOrders = workOrders.filter((wo) =>
    showArchived ? true : wo.status !== WorkOrderStatus.ARCHIVED
  );

  const createMutation = useMutation({
    mutationFn: async (data: InsertWorkOrder) => {
      const payload = {
        ...data,
        assignedTo: null,
        assetId: null,
        reportedDate: data.reportedDate.toISOString(),
        completedDate: null,
      };

      const res = await apiRequest("POST", "/api/work-orders", payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create work order");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Work order created successfully",
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

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<WorkOrder> & { id: number }) => {
      const { id, ...updates } = data;
      const res = await apiRequest("PATCH", `/api/work-orders/${id}`, updates);
      return await res.json();
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
      toast({
        title: "Error",
        description: error.message,
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
      detailsForm.reset(selectedWorkOrder);
    }
  }, [selectedWorkOrder, detailsForm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Work Orders</h1>
              <p className="text-muted-foreground">
                Manage and track maintenance tasks
              </p>
            </div>
            <div className="flex items-center gap-4">
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
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create Work Order
              </Button>
            </div>
          </div>

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
                  onClick={() => {
                    setSelectedWorkOrder(wo);
                    setIsDetailsDialogOpen(true);
                  }}
                >
                  <TableCell className="font-medium">{wo.title}</TableCell>
                  <TableCell>{wo.priority}</TableCell>
                  <TableCell>{wo.status}</TableCell>
                  <TableCell>
                    {new Date(wo.reportedDate).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

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
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending}
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
    </div>
  );
}