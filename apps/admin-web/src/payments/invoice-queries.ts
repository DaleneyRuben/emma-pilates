import {
  getListAdminPaymentsQueryKey,
  listAdminPayments,
  markPaymentInvoiceIssued,
  unmarkPaymentInvoiceIssued,
  type AdminPaymentDto,
  type AdminPaymentPageDto,
  type ListAdminPaymentsParams,
} from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";
import type { PaymentSearch } from "./payment-search";

const exportPageSize = 100;

/**
 * PAY-007: every row the filters match, page by page through the same list
 * the table reads, so the CSV and the filter always agree.
 */
export async function fetchAllPayments(
  search: PaymentSearch,
): Promise<AdminPaymentDto[]> {
  const rows: AdminPaymentDto[] = [];
  for (let page = 1; ; page += 1) {
    const params: ListAdminPaymentsParams = {
      page,
      pageSize: exportPageSize,
      status: search.status,
      ...(search.invoice === undefined ? {} : { invoice: search.invoice }),
      ...(search.q === undefined ? {} : { q: search.q }),
    };
    const result = (await listAdminPayments(params, undefined, adminFetch))
      .data as AdminPaymentPageDto;
    rows.push(...result.items);
    if (
      result.items.length === 0 ||
      page * exportPageSize >= result.totalItems
    ) {
      return rows;
    }
  }
}

/** «Marcar emitida» and «Deshacer»; the list is read again either way. */
export function useInvoiceIssuedMark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      issued,
    }: {
      paymentId: string;
      issued: boolean;
    }) =>
      issued
        ? markPaymentInvoiceIssued(paymentId, undefined, adminFetch)
        : unmarkPaymentInvoiceIssued(paymentId, undefined, adminFetch),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: getListAdminPaymentsQueryKey(),
      }),
  });
}
