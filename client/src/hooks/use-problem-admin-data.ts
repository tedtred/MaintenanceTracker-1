import { useQuery, useMutation, UseQueryResult } from "@tanstack/react-query";
import { ProblemButton, Asset } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";

// Define button form schema
export const buttonFormSchema = z.object({
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

export type ButtonFormData = z.infer<typeof buttonFormSchema>;

/**
 * Hook for managing problem tracking admin functionality
 */
export function useProblemAdmin() {
  // Query for problem buttons
  const buttonsQuery = useQuery<ProblemButton[]>({
    queryKey: ["/api/problem-buttons"],
  });
  
  // Query for assets (for work order integration)
  const assetsQuery = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });
  
  // Create button mutation
  const createButtonMutation = useMutation({
    mutationFn: async (data: ButtonFormData) => {
      const response = await apiRequest("POST", "/api/problem-buttons", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problem-buttons"] });
    },
  });
  
  // Update button mutation
  const updateButtonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: ButtonFormData }) => {
      const response = await apiRequest("PATCH", `/api/problem-buttons/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problem-buttons"] });
    },
  });
  
  // Delete button mutation
  const deleteButtonMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/problem-buttons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problem-buttons"] });
    },
  });
  
  // Function to get appropriate icon component name
  const getIconName = (iconName?: string): string => {
    return iconName || "AlertTriangle";
  };
  
  return {
    // Queries
    buttonsQuery,
    assetsQuery,
    
    // Mutations
    createButtonMutation,
    updateButtonMutation,
    deleteButtonMutation,
    
    // Utilities
    getIconName,
  };
}