import {
  getCurrentAdminWebAuthenticationSession,
  getGetCurrentAdminWebAuthenticationSessionQueryKey,
  type CurrentAuthenticationPrincipalDto,
} from "@pilates/api-contracts";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";
import { isApiError } from "../api/problem";

export const currentSessionQueryKey =
  getGetCurrentAdminWebAuthenticationSessionQueryKey();

// The startup probe: the cookie is HttpOnly, so only the backend can say
// whether this browser is signed in. Its 401 is the guard's to handle.
export const currentSessionQueryOptions = () =>
  queryOptions({
    queryKey: currentSessionQueryKey,
    queryFn: async ({ signal }) =>
      (await getCurrentAdminWebAuthenticationSession({ signal }, adminFetch))
        .data as CurrentAuthenticationPrincipalDto,
    meta: { sessionProbe: true },
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

export async function readSignedInSession(
  queryClient: QueryClient,
): Promise<CurrentAuthenticationPrincipalDto | null> {
  try {
    return await queryClient.ensureQueryData(currentSessionQueryOptions());
  } catch (error) {
    if (isApiError(error) && error.status === 401) return null;
    throw error;
  }
}

/**
 * Asks the backend directly, past the cache, whether the cookie still opens
 * a session: a refused request elsewhere is not proof it ended (FIX-058).
 * Anything but a 401 (a network failure, a 5xx) rejects, which keeps her.
 */
export async function isSignedIn(): Promise<boolean> {
  try {
    await getCurrentAdminWebAuthenticationSession(undefined, adminFetch);
    return true;
  } catch (error) {
    if (isApiError(error) && error.status === 401) return false;
    throw error;
  }
}
