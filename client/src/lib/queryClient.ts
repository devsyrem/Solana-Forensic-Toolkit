import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText;
    try {
      // Try to get response text
      errorText = await res.text();
    } catch (error) {
      console.error("Error reading response text:", error);
      errorText = res.statusText || "Unknown error";
    }
    
    console.error(`API error: ${res.status} ${res.statusText}`, errorText);
    throw new Error(`${res.status}: ${errorText}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`API request: ${method} ${url}`);
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    console.log(`API response from ${url}: status ${res.status}`);
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request error for ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`Fetching data from: ${queryKey[0]}`);
    
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      
      console.log(`Response received from ${queryKey[0]}: status ${res.status}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn("Unauthorized access, returning null as configured");
        return null;
      }

      await throwIfResNotOk(res);
      
      try {
        const data = await res.json();
        return data;
      } catch (error) {
        console.error(`Error parsing JSON from ${queryKey[0]}:`, error);
        throw new Error(`Failed to parse response: ${error}`);
      }
    } catch (error) {
      console.error(`Error fetching ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable to refresh data when window regains focus
      staleTime: 60000, // Consider data stale after 1 minute
      retry: 2, // Retry failed requests up to 2 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff with max 30s
      networkMode: "always", // Continue trying even when browser reports offline
    },
    mutations: {
      retry: 1, // Retry mutations once
      networkMode: "always",
    },
  },
});
