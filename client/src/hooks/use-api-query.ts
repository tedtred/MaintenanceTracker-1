import { useQuery, UseQueryResult, UseQueryOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatConnectionError } from "@/lib/api-error";
import { isDockerEnvironment } from "@/lib/config";

/**
 * A custom hook that wraps TanStack Query to handle API requests with proper type checking
 * and consistent JSON parsing.
 * 
 * @param endpoint API endpoint to query
 * @param options TanStack query options
 * @returns Query result with properly typed data
 */
export function useApiQuery<TData>(
  endpoint: string,
  options?: Omit<UseQueryOptions<TData, Error, TData, [string]>, "queryKey" | "queryFn">
): UseQueryResult<TData, Error> {
  // Log the environment information for debugging in Docker
  if (isDockerEnvironment() && !window._hasLoggedEnvironment) {
    console.log(`Running in Docker environment: ${window.location.hostname}`);
    console.log(`API requests will go to: ${window.location.origin}${endpoint}`);
    window._hasLoggedEnvironment = true;
  }

  return useQuery<TData, Error, TData, [string]>({
    queryKey: [endpoint],
    async queryFn() {
      try {
        const response = await apiRequest("GET", endpoint);
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data as TData;
      } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
        // Format connection errors with helpful messages for Docker environment
        throw formatConnectionError(error, endpoint);
      }
    },
    ...options,
  });
}

// Add the environment logging flag to the Window interface
declare global {
  interface Window {
    _hasLoggedEnvironment?: boolean;
  }
}