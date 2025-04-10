import { useMutation, UseQueryResult } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useApiQuery } from "./use-api-query";
import { useToast } from "@/hooks/use-toast";

import {
  Asset,
  InsertAsset,
} from "@shared/schema";

/**
 * Hook for working with assets data
 */
export function useAssets(options?: {
  enabled?: boolean;
}): {
  assetsQuery: UseQueryResult<Asset[], Error>;
  createAssetMutation: ReturnType<typeof useCreateAsset>;
  updateAssetMutation: ReturnType<typeof useUpdateAsset>;
  deleteAssetMutation: ReturnType<typeof useDeleteAsset>;
} {
  const assetsQuery = useApiQuery<Asset[]>(
    "/api/assets",
    { enabled: options?.enabled !== false }
  );
  
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset();
  const deleteAssetMutation = useDeleteAsset();
  
  return {
    assetsQuery,
    createAssetMutation,
    updateAssetMutation,
    deleteAssetMutation,
  };
}

export function useCreateAsset() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertAsset) => {
      const res = await apiRequest("POST", "/api/assets", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Asset created successfully",
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

export function useUpdateAsset() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Asset> }) => {
      const res = await apiRequest("PATCH", `/api/assets/${id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Asset updated successfully",
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

export function useDeleteAsset() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Asset deleted successfully",
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

/**
 * Get a single asset by ID
 */
export function useAssetById(id: number | undefined, options?: { enabled?: boolean }) {
  return useApiQuery<Asset>(
    id ? `/api/assets/${id}` : "/api/assets/undefined",
    { 
      enabled: id !== undefined && options?.enabled !== false 
    }
  );
}

/**
 * Import assets from CSV
 */
export function useImportAssets() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/assets/import", undefined, {
        body: formData,
        headers: {} // let the browser set content-type with boundary
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-schedules"] });
      
      toast({
        title: "Import Successful",
        description: `Imported ${data.successfulImports} of ${data.totalRows} records`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Export assets to CSV
 */
export function useExportAssets() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/assets/export");
      // Return the raw response so we can create blob
      return res;
    },
    onSuccess: async (res) => {
      try {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `assets-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error creating download:', error);
        toast({
          title: "Export Failed",
          description: "Could not create download file",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}