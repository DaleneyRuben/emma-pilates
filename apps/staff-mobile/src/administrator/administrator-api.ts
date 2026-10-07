import {
  cancelSession,
  confirmPayment,
  rejectPayment,
  type PaymentReviewDto,
  type SessionCancellationDto,
} from "@pilates/api-contracts";
import { loadPrivateImage } from "@pilates/mobile-core";

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

export function createAdministratorApi(fetcher: typeof globalThis.fetch): AdministratorApi {
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
    // The receipt is a private, authenticated image (mobile-core loader).
    loadReceipt: (receiptUrl) => loadPrivateImage(fetcher, receiptUrl),
    async rejectPayment(paymentId, reason) {
      const response = await rejectPayment(paymentId, { reason }, undefined, fetcher);
      requireSuccessfulResponse(response);
      return response.data as PaymentReviewDto;
    },
  };
}
