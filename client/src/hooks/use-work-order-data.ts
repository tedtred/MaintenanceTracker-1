import { useMutation, UseQueryResult } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useApiQuery } from "./use-api-query";
import { useToast } from "@/hooks/use-toast";

import {
  WorkOrder,
  InsertWorkOrder,
  WorkOrderAttachment,
  InsertWorkOrderAttachment,
} from "@shared/schema";

/**
 * Hook for working with work orders data
 */
export function useWorkOrders(options?: {
  enabled?: boolean;
}): {
  workOrdersQuery: UseQueryResult<WorkOrder[], Error>;
  createWorkOrderMutation: ReturnType<typeof useCreateWorkOrder>;
  updateWorkOrderMutation: ReturnType<typeof useUpdateWorkOrder>;
  deleteWorkOrderMutation: ReturnType<typeof useDeleteWorkOrder>;
} {
  const workOrdersQuery = useApiQuery<WorkOrder[]>(
    "/api/work-orders",
    { enabled: options?.enabled !== false }
  );
  
  const createWorkOrderMutation = useCreateWorkOrder();
  const updateWorkOrderMutation = useUpdateWorkOrder();
  const deleteWorkOrderMutation = useDeleteWorkOrder();
  
  return {
    workOrdersQuery,
    createWorkOrderMutation,
    updateWorkOrderMutation,
    deleteWorkOrderMutation,
  };
}

export function useWorkOrderById(id: number | undefined, options?: { enabled?: boolean }) {
  return useApiQuery<WorkOrder>(
    id ? `/api/work-orders/${id}` : "/api/work-orders/undefined",
    { 
      enabled: id !== undefined && options?.enabled !== false 
    }
  );
}

export function useWorkOrderAttachments(workOrderId: number | undefined, options?: { enabled?: boolean }) {
  return useApiQuery<WorkOrderAttachment[]>(
    workOrderId ? `/api/work-orders/${workOrderId}/attachments` : "/api/work-orders/attachments/undefined",
    {
      enabled: workOrderId !== undefined && options?.enabled !== false
    }
  );
}

export function useCreateWorkOrder() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertWorkOrder) => {
      const res = await apiRequest("POST", "/api/work-orders", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
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
}

export function useUpdateWorkOrder() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<WorkOrder> }) => {
      const res = await apiRequest("PATCH", `/api/work-orders/${id}`, updates);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${variables.id}`] });
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
}

export function useDeleteWorkOrder() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/work-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
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
}

export function useAddWorkOrderAttachment() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ workOrderId, formData }: { workOrderId: number; formData: FormData }) => {
      const res = await apiRequest("POST", `/api/work-orders/${workOrderId}/attachments`, undefined, {
        body: formData,
        headers: {} // let the browser set content-type with boundary
      });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${variables.workOrderId}/attachments`] });
      toast({
        title: "Success",
        description: "Attachment added successfully",
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
}