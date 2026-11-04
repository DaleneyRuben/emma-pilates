import {
  createBooking,
  getAdministratorSessionRoster,
  getGetAdministratorSessionRosterQueryKey,
  getListAdminClientsQueryKey,
  joinSessionWaitlist,
  listAdminClients,
  type AdminClientPageDto,
  type AdministratorSessionRosterDto,
  type ListAdminClientsParams,
} from "@pilates/api-contracts";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";
import { isBranchSessionsKey } from "./schedule-queries";

// WEB-039: who booked a Session and who waits for it.
export const sessionRosterQueryOptions = (sessionId: string) =>
  queryOptions({
    queryKey: getGetAdministratorSessionRosterQueryKey(sessionId),
    queryFn: async ({ signal }) =>
      (await getAdministratorSessionRoster(sessionId, { signal }, adminFetch))
        .data as AdministratorSessionRosterDto,
  });

/** Searching starts at two characters, so one letter never lists everyone. */
export const minimumClientQuery = 2;

// The Clientas list's own read, narrowed by name, email, or phone.
export const clientSearchQueryOptions = (q: string) => {
  const params: ListAdminClientsParams = { q, page: 1, pageSize: 8 };
  return queryOptions({
    queryKey: getListAdminClientsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminClients(params, { signal }, adminFetch))
        .data as AdminClientPageDto,
    enabled: q.length >= minimumClientQuery,
    placeholderData: keepPreviousData,
  });
};

export type BookClient = { clientId: string; waitlist: boolean };

/**
 * Books the Client into the Session, or puts her on its Waitlist when no
 * seat is left (ADR-0108). Each attempt carries a fresh idempotency key;
 * success refetches the roster and the Branch's weeks (their counts).
 */
export function useBookClient(sessionId: string, branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, waitlist }: BookClient) => {
      const send = waitlist ? joinSessionWaitlist : createBooking;
      await send(
        sessionId,
        { clientId },
        { headers: { "idempotency-key": crypto.randomUUID() } },
        adminFetch,
      );
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: getGetAdministratorSessionRosterQueryKey(sessionId),
        }),
        queryClient.invalidateQueries({
          predicate: isBranchSessionsKey(branchId),
        }),
      ]),
  });
}
