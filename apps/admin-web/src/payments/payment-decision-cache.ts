import {
  getGetAdminClientQueryKey,
  getGetIncomeReportQueryKey,
  getGetPaymentReviewQueryKey,
  getListAdminClientsQueryKey,
  getListAdminPaymentsQueryKey,
} from "@pilates/api-contracts";
import type { QueryClient } from "@tanstack/react-query";

export type DecisionOutcome = "confirmed" | "rejected" | "unknown";

const incomeReportPath = getGetIncomeReportQueryKey()[0];

// A confirmed transfer is studio-wide income: it counts only in the
// all-Branches report, never in a single Branch's (CONTEXT-MAP).
const isStudioIncomeKey = ({ queryKey }: { queryKey: readonly unknown[] }) =>
  queryKey[0] === incomeReportPath &&
  (queryKey[1] as { branchId?: string } | undefined)?.branchId === undefined;

/**
 * ADR-0042: exactly the cached reads a decision changes. Every Payment list
 * (Pagos and the sidebar count), the review, and the Client's detail (it
 * no longer shows a transfer awaiting review); a confirmation also starts
 * her Plan (the Clientes directory) and adds to the all-Branches income
 * report. No Credit is awarded or spent since PAY-005, so the Referral list
 * and other Clients stay as they are. A decision taken elsewhere (a
 * conflict) may have been either.
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
    queryClient.invalidateQueries({
      queryKey: getGetAdminClientQueryKey(change.clientId),
    }),
  ];
  if (change.outcome !== "rejected") {
    refreshes.push(
      queryClient.invalidateQueries({
        queryKey: getListAdminClientsQueryKey(),
        exact: false,
      }),
      queryClient.invalidateQueries({ predicate: isStudioIncomeKey }),
    );
  }
  await Promise.all(refreshes);
}
