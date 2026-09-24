import {
  getGetAdminClientQueryKey,
  getGetPaymentReviewQueryKey,
  getListAdminClientsQueryKey,
  getListAdminCreditsQueryKey,
  getListAdminPaymentsQueryKey,
  getListAdminReferralsQueryKey,
} from "@pilates/api-contracts";
import type { QueryClient } from "@tanstack/react-query";

export type DecisionOutcome = "confirmed" | "rejected" | "unknown";

const clientsPath = getListAdminClientsQueryKey()[0];

/**
 * ADR-0042: exactly the cached reads a decision changes. Every Payment list
 * (Pagos and the sidebar count) and the review; a confirmation starts the
 * Client's Plan (the Clientes directory and her detail) and a first Payment
 * may award Credit to her referrer, whom the admin web cannot name, so every
 * Client detail and the Referral and Credit lists; a rejection releases only
 * her reserved Credit (her detail and the Credit list). A decision taken
 * elsewhere (a conflict) may have been either.
 */
export async function refreshAfterDecision(
  queryClient: QueryClient,
  change: { outcome: DecisionOutcome; paymentId: string; clientId: string },
): Promise<void> {
  const refreshes = [
    queryClient.invalidateQueries({
      queryKey: getListAdminPaymentsQueryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: getGetPaymentReviewQueryKey(change.paymentId),
    }),
    queryClient.invalidateQueries({ queryKey: getListAdminCreditsQueryKey() }),
  ];
  if (change.outcome === "rejected") {
    refreshes.push(
      queryClient.invalidateQueries({
        queryKey: getGetAdminClientQueryKey(change.clientId),
      }),
    );
  } else {
    refreshes.push(
      queryClient.invalidateQueries({
        queryKey: getListAdminClientsQueryKey(),
        exact: false,
      }),
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          typeof queryKey[0] === "string" &&
          queryKey[0].startsWith(`${clientsPath}/`),
      }),
      queryClient.invalidateQueries({
        queryKey: getListAdminReferralsQueryKey(),
      }),
    );
  }
  await Promise.all(refreshes);
}
