import {
  attachStaffPaymentInvoice,
  removeStaffPaymentInvoice,
  type StaffInvoiceDto,
} from "@pilates/api-contracts";

/** A refused invoice request, with the API's problem code when it sent one. */
export class InvoiceApiError extends Error {
  constructor(readonly code: string | null) {
    super("The invoice request could not be completed");
  }
}

const problemCode = (data: unknown): string | null =>
  typeof data === "object" && data !== null && "code" in data
    ? String((data as { code: unknown }).code)
    : null;

// FIX-044 (E5): attach the uploaded file, or hide the current one.
export function createInvoicesApi(fetcher: typeof globalThis.fetch) {
  return {
    attach: async (
      paymentId: string,
      upload: { imageAssetId: string; fileName: string },
    ): Promise<StaffInvoiceDto> => {
      const response = await attachStaffPaymentInvoice(paymentId, upload, undefined, fetcher);
      if (response.status !== 200) throw new InvoiceApiError(problemCode(response.data));
      return response.data as StaffInvoiceDto;
    },
    remove: async (paymentId: string): Promise<StaffInvoiceDto> => {
      const response = await removeStaffPaymentInvoice(paymentId, undefined, fetcher);
      if (response.status !== 200) throw new InvoiceApiError(problemCode(response.data));
      return response.data as StaffInvoiceDto;
    },
  };
}
