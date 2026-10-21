import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { reportRequestFailure } from "../monitoring/error-reporting";
import { isApiError } from "./problem";
import type { SessionExpiry } from "./session-expiry";

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

/**
 * The caches see each failure once, after the retry, whichever page asked:
 * the session's end goes to the guard and the failure to error monitoring
 * (WEB-032), which decides what is worth reporting.
 */
export function createAdminQueryClient(
  options: {
    sessionExpiry?: SessionExpiry;
    reportFailure?: (error: unknown) => void;
  } = {},
): QueryClient {
  const { sessionExpiry, reportFailure = reportRequestFailure } = options;

  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        sessionExpiry?.report(error, query.meta);
        reportFailure(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        sessionExpiry?.report(error, mutation.meta);
        reportFailure(error);
      },
    }),
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
