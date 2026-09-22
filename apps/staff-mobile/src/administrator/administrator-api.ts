import {
  cancelSession,
  confirmPayment,
  rejectPayment,
  type PaymentReviewDto,
  type SessionCancellationDto,
} from "@pilates/api-contracts";
import { encodeBase64 } from "@pilates/mobile-core";

export type AdministratorApi = {
  cancelSession: (sessionId: string) => Promise<SessionCancellationDto>;
  confirmPayment: (paymentId: string) => Promise<PaymentReviewDto>;
  loadReceipt: (receiptUrl: string) => Promise<string | null>;
  rejectPayment: (paymentId: string, reason: string) => Promise<PaymentReviewDto>;
};

function requireSuccessfulResponse({ status }: { status: number }): void {
  if (status < 200 || status >= 300) {
    throw new Error("The Administrator request could not be completed");
  }
}

export function createAdministratorApi(
  fetcher: typeof globalThis.fetch,
): AdministratorApi {
  return {
    async cancelSession(sessionId) {
      const response = await cancelSession(sessionId, undefined, fetcher);
      requireSuccessfulResponse(response);
      return response.data as SessionCancellationDto;
    },
    async confirmPayment(paymentId) {
      const response = await confirmPayment(paymentId, undefined, fetcher);
      requireSuccessfulResponse(response);
      return response.data as PaymentReviewDto;
    },
    // The receipt is a private, authenticated image: it is fetched through the
    // API fetcher and rendered inline as a data URI.
    async loadReceipt(receiptUrl) {
      const response = await fetcher(receiptUrl);
      if (!response.ok) return null;
      const bytes = new Uint8Array(await response.arrayBuffer());
      const type = response.headers.get("Content-Type") ?? "image/jpeg";
      return `data:${type};base64,${encodeBase64(bytes)}`;
    },
    async rejectPayment(paymentId, reason) {
      const response = await rejectPayment(
        paymentId,
        { reason },
        undefined,
        fetcher,
      );
      requireSuccessfulResponse(response);
      return response.data as PaymentReviewDto;
    },
  };
}
