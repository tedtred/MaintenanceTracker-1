import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { WorkOrder, WorkOrderStatus, WorkOrderPriority, Asset, AssetStatus } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Wrench, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { WorkOrderLayout } from "@/components/work-order-layout";

export default function WorkOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const workOrderId = id ? parseInt(id) : null;

  const { data: workOrder, isLoading, error } = useQuery<WorkOrder>({
    queryKey: [`/api/work-orders/${workOrderId}`],
    enabled: !!workOrderId,
  });
  
  // Fetch the asset if assetId is available
  const { data: asset } = useQuery<Asset>({
    queryKey: [`/api/assets/${workOrder?.assetId}`],
    enabled: !!workOrder?.assetId,
  });

  // Add mutation for updating the asset status
  const updateAssetStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!workOrder?.assetId) throw new Error("No asset ID");
      
      const res = await apiRequest("PATCH", `/api/assets/${workOrder.assetId}`, {
        status
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/assets/${workOrder?.assetId}`] });
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

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<WorkOrder>) => {
      if (!workOrderId) throw new Error("No work order ID");

      // Only send fields that are actually being updated
      const updates = {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        affectsAssetStatus: data.affectsAssetStatus,
        partsRequired: data.partsRequired,
        problemDetails: data.problemDetails,
        solutionNotes: data.solutionNotes
      };

      // If status is "WAITING_ON_PARTS" and affectsAssetStatus is true,
      // update the asset status to MAINTENANCE
      if (data.status === WorkOrderStatus.WAITING_ON_PARTS && 
          data.affectsAssetStatus && 
          workOrder?.assetId && 
          asset?.status !== AssetStatus.MAINTENANCE) {
        updateAssetStatusMutation.mutate(AssetStatus.MAINTENANCE);
      }

      const res = await apiRequest("PATCH", `/api/work-orders/${workOrderId}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate both work orders and problem events queries
      queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${workOrderId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/problem-events"] });
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

  const form = useForm({
    values: {
      title: workOrder?.title || "",
      description: workOrder?.description || "",
      status: workOrder?.status || WorkOrderStatus.OPEN,
      priority: workOrder?.priority || WorkOrderPriority.MEDIUM,
      affectsAssetStatus: workOrder?.affectsAssetStatus || false,
      partsRequired: workOrder?.partsRequired || "",
      problemDetails: workOrder?.problemDetails || "",
      solutionNotes: workOrder?.solutionNotes || "",
    },
  });

  if (!workOrderId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Work Order ID</h1>
          <Link href="/work-orders">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Work Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Work Order Not Found</h1>
          <Link href="/work-orders">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Work Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <WorkOrderLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/work-orders">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Work Orders
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Work Order Details</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Work Order Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) =>
                  updateMutation.mutate(data)
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
                        <Textarea {...field} className="min-h-[100px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
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
                </div>
                
                {/* Conditionally show parts required input when status is WAITING_ON_PARTS */}
                {form.watch("status") === WorkOrderStatus.WAITING_ON_PARTS && (
                  <FormField
                    control={form.control}
                    name="partsRequired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parts Required</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="List the parts needed for this work order" 
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Specify the parts needed to complete this maintenance task
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* Problem details & solution section */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-4">Problem Details & Resolution</h3>
                  
                  <FormField
                    control={form.control}
                    name="problemDetails"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Problem Details</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter detailed information about the problem..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Technical information, troubleshooting steps tried, or additional context
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="solutionNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Solution Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter details about how the problem was resolved..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Document the solution or fix implemented to resolve this issue
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Show Asset Status Section if assetId exists */}
                {workOrder.assetId && (
                  <div className="border p-4 rounded-lg bg-muted/40 space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Asset Information</h3>
                        <p className="text-sm text-muted-foreground">
                          {asset?.name} - Current status: <span className="font-medium">{asset?.status}</span>
                        </p>
                      </div>
                      
                      {/* Add direct asset status update button */}
                      {asset && (
                        <Select
                          value={asset.status}
                          onValueChange={(status) => updateAssetStatusMutation.mutate(status)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Change Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(AssetStatus).map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="affectsAssetStatus"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              <div className="flex items-center">
                                <Wrench className="w-4 h-4 mr-2" />
                                This work order affects equipment status
                              </div>
                            </FormLabel>
                            <FormDescription>
                              When enabled, this work order will update the asset's status automatically
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
                    
                    {form.watch("affectsAssetStatus") && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-3">
                        <div className="flex gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-medium text-amber-800 dark:text-amber-200">Asset Status Will Change</p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              When this work order status is "Waiting on Parts", the asset status will 
                              automatically be set to "Maintenance".
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
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
          </CardContent>
        </Card>
      </div>
    </WorkOrderLayout>
  );
}