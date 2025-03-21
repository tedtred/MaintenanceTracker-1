import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { WorkOrder, WorkOrderStatus, WorkOrderPriority } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { SidebarNav } from "@/components/sidebar-nav";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";

export default function WorkOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const workOrderId = id ? parseInt(id) : null;

  const { data: workOrder, isLoading, error } = useQuery<WorkOrder>({
    queryKey: [`/api/work-orders/${workOrderId}`],
    enabled: !!workOrderId,
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
      };

      const res = await apiRequest("PATCH", `/api/work-orders/${workOrderId}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${workOrderId}`] });
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
    <div className="flex h-screen">
      <SidebarNav />
      <div className="flex-1 p-8">
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
      </div>
    </div>
  );
}