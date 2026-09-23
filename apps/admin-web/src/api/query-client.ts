import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./problem";

const maxRetries = 1;

/**
 * A 4xx problem is the backend's deliberate answer and repeating the request
 * cannot change it; a 5xx or a network failure may be transient.
 */
export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= maxRetries) return false;
  if (isApiError(error)) {
    return error.status === 0 || error.status >= 500;
  }
  return true;
}

export function createAdminQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
