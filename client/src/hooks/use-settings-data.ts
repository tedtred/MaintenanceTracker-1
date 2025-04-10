import { useMutation, UseQueryResult } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useApiQuery } from "./use-api-query";
import { useToast } from "@/hooks/use-toast";

import {
  Settings,
} from "@shared/schema";

/**
 * Hook for working with application settings
 */
export function useSettings(options?: {
  enabled?: boolean;
}): {
  settingsQuery: UseQueryResult<Settings, Error>;
  updateSettingsMutation: ReturnType<typeof useUpdateSettings>;
} {
  const settingsQuery = useApiQuery<Settings>(
    "/api/settings",
    { enabled: options?.enabled !== false }
  );
  
  const updateSettingsMutation = useUpdateSettings();
  
  return {
    settingsQuery,
    updateSettingsMutation,
  };
}

export function useUpdateSettings() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      const res = await apiRequest("PATCH", "/api/settings", updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
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