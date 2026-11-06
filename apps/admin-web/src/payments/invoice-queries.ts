import {
  attachStaffPaymentInvoice,
  getGetStaffPaymentInvoiceFileUrl,
  getGetStaffPaymentInvoiceQueryKey,
  getListAdminPaymentsQueryKey,
  getStaffPaymentInvoice,
  listAdminPayments,
  removeStaffPaymentInvoice,
  type AdminPaymentDto,
  type AdminPaymentPageDto,
  type ListAdminPaymentsParams,
  type StaffInvoiceDto,
} from "@pilates/api-contracts";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";
import { uploadImage } from "../api/upload-image";
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

// FIX-044: the payment's invoice, read fresh each time its panel opens.
export const paymentInvoiceQueryOptions = (paymentId: string) =>
  queryOptions({
    queryKey: getGetStaffPaymentInvoiceQueryKey(paymentId),
    queryFn: async ({ signal }) =>
      (await getStaffPaymentInvoice(paymentId, { signal }, adminFetch))
        .data as StaffInvoiceDto,
  });

/** Same-origin, so the admin session cookie authorizes the download. */
export const invoiceFileUrl = (paymentId: string) =>
  getGetStaffPaymentInvoiceFileUrl(paymentId);

const useSettleInvoice = (paymentId: string) => {
  const queryClient = useQueryClient();
  return (invoice: StaffInvoiceDto) => {
    queryClient.setQueryData(
      getGetStaffPaymentInvoiceQueryKey(paymentId),
      invoice,
    );
    void queryClient.invalidateQueries({
      queryKey: getListAdminPaymentsQueryKey(),
    });
  };
};

/**
 * Upload the file (Test 32's calls, purpose `invoice`), then attach it to
 * the payment, which marks it «Factura emitida» and tells the Client. The
 * finished upload is kept, so «Reintentar» only attaches again.
 */
export function useUploadInvoice(paymentId: string) {
  const settle = useSettleInvoice(paymentId);
  return useMutation({
    mutationFn: async ({
      file,
      imageAssetId,
    }: {
      file: File;
      imageAssetId?: string;
    }) => {
      const assetId =
        imageAssetId ?? (await uploadImage(file, "invoice", adminFetch));
      try {
        return (
          await attachStaffPaymentInvoice(
            paymentId,
            { imageAssetId: assetId, fileName: file.name },
            undefined,
            adminFetch,
          )
        ).data as StaffInvoiceDto;
      } catch (error) {
        throw Object.assign(error as object, { imageAssetId: assetId });
      }
    },
    onSuccess: settle,
  });
}

/** «Quitar factura»: hidden, never deleted; the mark goes with it. */
export function useRemoveInvoice(paymentId: string) {
  const settle = useSettleInvoice(paymentId);
  return useMutation({
    mutationFn: async () =>
      (await removeStaffPaymentInvoice(paymentId, undefined, adminFetch))
        .data as StaffInvoiceDto,
    onSuccess: settle,
  });
}
