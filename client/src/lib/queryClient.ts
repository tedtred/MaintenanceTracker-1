import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handleAPIResponse } from "./api-error";
import { getApiBaseUrl } from "./config";

// Get the base API URL from configuration
const API_BASE_URL = getApiBaseUrl();

// Helper to build a full API URL using the base URL
const buildApiUrl = (url: string): string => {
  // If the URL already includes the protocol (http/https), use it as is
  if (url.startsWith('http')) {
    return url;
  }
  
  // Special case for 192.168.0.122 IP address (Docker environment)
  if (window.location.hostname === '192.168.0.122') {
    // Use the full origin (including port) with the API path
    return `${window.location.origin}${url}`;
  }
  
  // Otherwise, prepend the base URL
  return `${API_BASE_URL}${url}`;
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = buildApiUrl(url);
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  return handleAPIResponse(res);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const fullUrl = buildApiUrl(url);
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    const handledRes = await handleAPIResponse(res);
    return handledRes.json();
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