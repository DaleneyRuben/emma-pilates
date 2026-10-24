import {
  getGetAdminClientQueryKey,
  getGetIncomeReportQueryKey,
  getGetPaymentReviewQueryKey,
  getListAdminClientsQueryKey,
  getListAdminEvaluationsQueryKey,
  getListAdminPaymentsQueryKey,
  getListAdminReferralsQueryKey,
  getListStaffMembersQueryKey,
} from "@pilates/api-contracts";
import { QueryClient } from "@tanstack/react-query";
import { refreshAfterDecision } from "./payment-decision-cache";

const paymentId = "9a000000-0000-5000-8000-000000000001";
const otherPaymentId = "9a000000-0000-5000-8000-000000000002";
const clientId = "c1000000-0000-5000-8000-000000000001";
const referrerId = "c1000000-0000-5000-8000-000000000009";

const keys = {
  pendingTable: getListAdminPaymentsQueryKey({
    page: 1,
    pageSize: 20,
    status: "pending",
  }),
  badge: getListAdminPaymentsQueryKey({
    page: 1,
    pageSize: 1,
    status: "pending",
  }),
  review: getGetPaymentReviewQueryKey(paymentId),
  otherReview: getGetPaymentReviewQueryKey(otherPaymentId),
  clientTable: getListAdminClientsQueryKey({ page: 1, pageSize: 20 }),
  client: getGetAdminClientQueryKey(clientId),
  referrer: getGetAdminClientQueryKey(referrerId),
  staff: getListStaffMembersQueryKey({ page: 1, pageSize: 20 }),
  referrals: getListAdminReferralsQueryKey({ page: 1, pageSize: 20 }),
  searchedReferrals: getListAdminReferralsQueryKey({
    page: 1,
    pageSize: 20,
    query: "sofia",
  }),
  studioIncome: getGetIncomeReportQueryKey({
    from: "2026-08-01T04:00:00.000Z",
    until: "2026-10-01T04:00:00.000Z",
  }),
  branchIncome: getGetIncomeReportQueryKey({
    from: "2026-08-01T04:00:00.000Z",
    until: "2026-10-01T04:00:00.000Z",
    branchId: "0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c001",
  }),
  evaluations: getListAdminEvaluationsQueryKey({
    from: "2026-09-21T04:00:00.000Z",
    until: "2026-09-28T04:00:00.000Z",
  }),
  branches: ["/api/v1/administrator/branches", { status: "active" }],
} as const;

const seeded = () => {
  const queryClient = new QueryClient();
  for (const key of Object.values(keys)) queryClient.setQueryData(key, {});
  return queryClient;
};

const invalidated = (queryClient: QueryClient) =>
  Object.entries(keys)
    .filter(([, key]) => queryClient.getQueryState(key)?.isInvalidated)
    .map(([name]) => name)
    .sort();

// ADR-0042: a decision refreshes exactly the cached reads it changes.
describe("the cache after a Payment decision", () => {
  it("refreshes the Payment lists, the review, and the Clients a confirmation touches", async () => {
    const queryClient = seeded();

    await refreshAfterDecision(queryClient, {
      outcome: "confirmed",
      paymentId,
      clientId,
    });

    // The Plan starts (the directory and her detail show it) and a transfer
    // counts as income only in the all-Branches report (CONTEXT-MAP). No
    // Credit is awarded or spent any more (PAY-005), so the Referral list
    // and the referrer's detail stay as they are.
    expect(invalidated(queryClient)).toEqual(
      [
        "badge",
        "client",
        "clientTable",
        "pendingTable",
        "review",
        "studioIncome",
      ].sort(),
    );
  });

  it("refreshes the Payment lists, the review, and only that Client after a rejection", async () => {
    const queryClient = seeded();

    await refreshAfterDecision(queryClient, {
      outcome: "rejected",
      paymentId,
      clientId,
    });

    // Her detail no longer shows a transfer awaiting review; nothing else
    // about any Client changes.
    expect(invalidated(queryClient)).toEqual(
      ["badge", "client", "pendingTable", "review"].sort(),
    );
  });

  it("treats a decision taken elsewhere like a confirmation, since either may have happened", async () => {
    const queryClient = seeded();

    await refreshAfterDecision(queryClient, {
      outcome: "unknown",
      paymentId,
      clientId,
    });

    expect(invalidated(queryClient)).toEqual(
      [
        "badge",
        "client",
        "clientTable",
        "pendingTable",
        "review",
        "studioIncome",
      ].sort(),
    );
  });
});
