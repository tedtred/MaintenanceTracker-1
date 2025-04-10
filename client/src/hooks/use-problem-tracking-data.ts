import { useQuery, useMutation, UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { ProblemButton, ProblemEvent, Asset } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";

// Define problem report schema
export const problemReportSchema = z.object({
  buttonId: z.number().int().positive("Button selection is required"),
  notes: z.string().optional(),
  problemDetails: z.string().optional(),
  locationName: z.string().optional(),
  // Handle assetId as either null, undefined, or a positive number
  assetId: z.union([
    z.literal(null),
    z.number().int().positive()
  ]).optional(),
  // Add timestamp field to match server schema
  timestamp: z.date().optional().default(() => new Date()),
});

export type ProblemReportData = z.infer<typeof problemReportSchema>;

// Define solution form data interface
export interface SolutionFormData {
  solutionNotes: string;
}

/**
 * Hook to handle problem tracking data and operations
 */
export function useProblemTracking() {
  // Query for problem buttons
  const buttonsQuery = useQuery<ProblemButton[]>({
    queryKey: ["/api/problem-buttons"],
  });
  
  // Query for problem events (reports)
  const eventsQuery = useQuery<ProblemEvent[]>({
    queryKey: ["/api/problem-events"],
  });
  
  // Get active buttons only
  const getActiveButtons = (): ProblemButton[] => {
    if (!Array.isArray(buttonsQuery.data)) return [];
    return buttonsQuery.data.filter(button => button.active);
  };

  // Group buttons into rows of N
  const getButtonRows = (buttonsPerRow: number = 2): ProblemButton[][] => {
    const activeButtons = getActiveButtons();
    if (buttonsPerRow === 1) return activeButtons.map(button => [button]);
    
    return activeButtons.reduce<ProblemButton[][]>((rows, button, index) => {
      if (index % buttonsPerRow === 0) {
        rows.push([button]);
      } else {
        rows[rows.length - 1].push(button);
      }
      return rows;
    }, []);
  };
  
  // Get button label by ID
  const getButtonLabel = (buttonId: number): string => {
    if (!Array.isArray(buttonsQuery.data)) return "Unknown";
    const button = buttonsQuery.data.find(b => b.id === buttonId);
    return button ? button.label : "Unknown";
  };
  
  // Get button by ID
  const getButtonById = (buttonId: number): ProblemButton | undefined => {
    if (!Array.isArray(buttonsQuery.data)) return undefined;
    return buttonsQuery.data.find(b => b.id === buttonId);
  };
  
  // Calculate status counts for stats
  const getProblemStats = () => {
    if (!Array.isArray(eventsQuery.data)) {
      return { openProblems: 0, resolvedProblems: 0, highPriorityProblems: 0 };
    }
    
    const events = eventsQuery.data;
    const buttons = Array.isArray(buttonsQuery.data) ? buttonsQuery.data : [];
    
    const openProblems = events.filter(event => !event.resolved).length;
    const resolvedProblems = events.filter(event => event.resolved).length;
    const highPriorityProblems = events.filter(event => {
      if (event.resolved) return false;
      const button = buttons.find(b => b.id === event.buttonId);
      return button?.label.toLowerCase().includes("critical") || false;
    }).length;
    
    return { openProblems, resolvedProblems, highPriorityProblems };
  };
  
  // Report problem mutation
  const reportProblemMutation = useMutation({
    mutationFn: async (data: ProblemReportData) => {
      const response = await apiRequest("POST", "/api/problem-events", data);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate both problem events and work orders queries
      queryClient.invalidateQueries({ queryKey: ["/api/problem-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
    },
  });
  
  // Resolve problem mutation
  const resolveProblemMutation = useMutation({
    mutationFn: async ({ id, solutionNotes }: { id: number, solutionNotes: string }) => {
      const response = await apiRequest("POST", `/api/problem-events/${id}/resolve`, { solutionNotes });
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate both problem events and work orders queries
      queryClient.invalidateQueries({ queryKey: ["/api/problem-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
    },
  });
  
  // Filter events by resolved status
  const getFilteredEvents = (resolved: boolean): ProblemEvent[] => {
    if (!Array.isArray(eventsQuery.data)) return [];
    return eventsQuery.data.filter(event => event.resolved === resolved);
  };
  
  return {
    // Queries
    buttonsQuery,
    eventsQuery,
    
    // Data transformations
    getActiveButtons,
    getButtonRows,
    getButtonLabel,
    getButtonById,
    getProblemStats,
    getFilteredEvents,
    
    // Mutations
    reportProblemMutation,
    resolveProblemMutation,
  };
}

// Hook to get asset data for problem reports
export function useAssets() {
  const assetsQuery = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });
  
  // Get asset name by ID
  const getAssetName = (assetId: number | null): string => {
    if (!assetId) return "None";
    if (!Array.isArray(assetsQuery.data)) return "Unknown";
    const asset = assetsQuery.data.find(a => a.id === assetId);
    return asset ? asset.name : "Unknown";
  };
  
  return {
    assetsQuery,
    getAssetName,
  };
}