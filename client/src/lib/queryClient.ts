import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handleAPIResponse, formatConnectionError } from "./api-error";
import { getApiUrl, isDockerEnvironment } from "./config";

// Helper to build a full API URL using the configuration module
const buildApiUrl = (url: string): string => {
  // If the URL already includes the protocol (http/https), use it as is
  if (url.startsWith('http')) {
    return url;
  }
  
  // If the URL starts with /api/, strip the /api/ prefix since getApiUrl adds it
  const endpoint = url.startsWith('/api/') ? url.substring(5) : url;
  
  // Use the config utility to get the proper URL based on environment
  return getApiUrl(endpoint);
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = buildApiUrl(url);
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    return handleAPIResponse(res);
  } catch (error) {
    // Format the error specifically for Docker environments
    throw formatConnectionError(error, fullUrl);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const fullUrl = buildApiUrl(url);
    
    try {
      const res = await fetch(fullUrl, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      const handledRes = await handleAPIResponse(res);
      return handledRes.json();
    } catch (error) {
      // Format the error using our helper for better user messaging
      // especially important for Docker environment connection issues
      throw formatConnectionError(error, fullUrl);
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});