import { useMutation, UseQueryResult } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useApiQuery } from "./use-api-query";
import { useToast } from "@/hooks/use-toast";

import {
  MaintenanceSchedule,
  InsertMaintenanceSchedule,
  MaintenanceCompletion,
  InsertMaintenanceCompletion,
} from "@shared/schema";

/**
 * Hook for working with maintenance schedules
 */
export function useMaintenanceSchedules(options?: {
  enabled?: boolean;
}): {
  schedulesQuery: UseQueryResult<MaintenanceSchedule[], Error>;
  completionsQuery: UseQueryResult<MaintenanceCompletion[], Error>;
  createScheduleMutation: ReturnType<typeof useCreateSchedule>;
  updateScheduleMutation: ReturnType<typeof useUpdateSchedule>;
  deleteScheduleMutation: ReturnType<typeof useDeleteSchedule>;
  completeMaintenanceMutation: ReturnType<typeof useCompleteMaintenanceMutation>;
} {
  const { toast } = useToast();
  
  // Queries
  const schedulesQuery = useApiQuery<MaintenanceSchedule[]>(
    "/api/maintenance-schedules",
    { enabled: options?.enabled !== false }
  );
  
  const completionsQuery = useApiQuery<MaintenanceCompletion[]>(
    "/api/maintenance-completions",
    { enabled: options?.enabled !== false }
  );
  
  // Mutations
  const createScheduleMutation = useMutation({
    mutationFn: async (data: InsertMaintenanceSchedule) => {
      const res = await apiRequest("POST", "/api/maintenance-schedules", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
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

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<MaintenanceSchedule> }) => {
      const res = await apiRequest("PATCH", `/api/maintenance-schedules/${id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
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

  const deleteScheduleMutation = useMutation({
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

  const completeMaintenanceMutation = useMutation({
    mutationFn: async (data: InsertMaintenanceCompletion) => {
      const res = await apiRequest("POST", "/api/maintenance-completions", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-completions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      toast({
        title: "Success",
        description: "Maintenance task marked as completed",
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

  return {
    schedulesQuery,
    completionsQuery,
    createScheduleMutation,
    updateScheduleMutation,
    deleteScheduleMutation,
    completeMaintenanceMutation,
  };
}

// Individual hooks for specific use cases
export function useCreateSchedule() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertMaintenanceSchedule) => {
      const res = await apiRequest("POST", "/api/maintenance-schedules", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
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
}

export function useUpdateSchedule() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<MaintenanceSchedule> }) => {
      const res = await apiRequest("PATCH", `/api/maintenance-schedules/${id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
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
}

export function useDeleteSchedule() {
  const { toast } = useToast();
  
  return useMutation({
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
}

export function useCompleteMaintenanceMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertMaintenanceCompletion) => {
      const res = await apiRequest("POST", "/api/maintenance-completions", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-completions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      toast({
        title: "Success",
        description: "Maintenance task marked as completed",
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