import {
  getGetPaymentReviewQueryKey,
  getListAdminPaymentsQueryKey,
  getPaymentReview,
  listAdminPayments,
  type AdminPaymentPageDto,
  type ListAdminPaymentsParams,
  type PaymentReviewDto,
} from "@pilates/api-contracts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";
import type { PaymentSearch } from "./payment-search";

const readPage = async (
  params: ListAdminPaymentsParams,
  signal: AbortSignal,
): Promise<AdminPaymentPageDto> =>
  (await listAdminPayments(params, { signal }, adminFetch))
    .data as AdminPaymentPageDto;

// Studio-wide, so no key names the selected Branch (AW34 shows the selector
// but ignores it here).
export const paymentTableQueryOptions = (search: PaymentSearch) => {
  const params: ListAdminPaymentsParams = {
    page: search.page,
    pageSize: search.pageSize,
    status: search.status,
    ...(search.q === undefined ? {} : { q: search.q }),
  };
  return queryOptions({
    queryKey: getListAdminPaymentsQueryKey(params),
    queryFn: ({ signal }) => readPage(params, signal),
    placeholderData: keepPreviousData,
  });
};

// The sidebar's Pagos badge: one row is enough to learn the studio count.
const badgeParams: ListAdminPaymentsParams = {
  page: 1,
  pageSize: 1,
  status: "pending",
};

export const pendingPaymentCountQueryOptions = () =>
  queryOptions({
    queryKey: getListAdminPaymentsQueryKey(badgeParams),
    queryFn: ({ signal }) => readPage(badgeParams, signal),
    select: (page) => page.pendingCount,
  });

// The review is re-read every time the panel opens: another Administrator
// or the Staff app may have decided the Payment meanwhile (ADR-0006).
export const paymentReviewQueryOptions = (paymentId: string) =>
  queryOptions({
    queryKey: getGetPaymentReviewQueryKey(paymentId),
    queryFn: async ({ signal }) =>
      (await getPaymentReview(paymentId, { signal }, adminFetch))
        .data as PaymentReviewDto,
    staleTime: 0,
  });
