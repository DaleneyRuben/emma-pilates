import {
  getListAdminEvaluationsQueryKey,
  getListAdminPaymentsQueryKey,
  getListAssistantClientBookingsQueryKey,
  getListAssistantClientHistoryQueryKey,
  listAdminEvaluations,
  listAdminPayments,
  listAssistantClientBookings,
  listAssistantClientHistory,
  type AdminEvaluationPageDto,
  type AdminPaymentPageDto,
  type AssistantClientBookingDto,
  type ClassHistoryEntryDto,
  type ListAdminEvaluationsParams,
  type ListAdminPaymentsParams,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";

// WEB-040: what the Client file's tabs read. Each is read when its tab
// opens, and again on every opening: a booking or a sale may have changed.

// The Assistant's reads, open to the Administrator and the Coordinator too
// (ADR-0102, ADR-0108).
export const clientBookingsQueryOptions = (clientId: string) =>
  queryOptions({
    queryKey: getListAssistantClientBookingsQueryKey(clientId),
    queryFn: async ({ signal }) =>
      (await listAssistantClientBookings(clientId, { signal }, adminFetch))
        .data as AssistantClientBookingDto[],
    staleTime: 0,
  });

export const clientHistoryQueryOptions = (clientId: string) =>
  queryOptions({
    queryKey: getListAssistantClientHistoryQueryKey(clientId),
    queryFn: async ({ signal }) =>
      (await listAssistantClientHistory(clientId, { signal }, adminFetch))
        .data as ClassHistoryEntryDto[],
    staleTime: 0,
  });

// Her latest sales; the whole list stays on Dinero › Pagos.
export const clientPaymentsQueryOptions = (clientId: string) => {
  const params: ListAdminPaymentsParams = {
    clientId,
    status: "all",
    page: 1,
    pageSize: 20,
  };
  return queryOptions({
    queryKey: getListAdminPaymentsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminPayments(params, { signal }, adminFetch))
        .data as AdminPaymentPageDto,
    staleTime: 0,
  });
};

// Every Evaluation she has booked, newest first, with no date range.
export const clientEvaluationsQueryOptions = (clientId: string) => {
  const params: ListAdminEvaluationsParams = {
    clientId,
    page: 1,
    pageSize: 20,
  };
  return queryOptions({
    queryKey: getListAdminEvaluationsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminEvaluations(params, { signal }, adminFetch))
        .data as AdminEvaluationPageDto,
    staleTime: 0,
  });
};
