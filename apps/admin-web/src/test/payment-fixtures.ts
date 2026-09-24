import type {
  AdminPaymentDto,
  AdminPaymentPageDto,
  PaymentReviewDto,
} from "@pilates/api-contracts";
import { http } from "msw";
import { apiUrl, jsonResponse } from "./msw";

export const paymentsPath = "/api/v1/administrator/payments";

export const paymentRow = (
  suffix: string,
  clientName: string,
  extra: Partial<AdminPaymentDto> = {},
): AdminPaymentDto => ({
  id: `9a000000-0000-5000-8000-0000000000${suffix}`,
  clientId: `c1000000-0000-5000-8000-0000000000${suffix}`,
  clientName,
  planName: "Paquete de 8 clases",
  planPriceCentavos: 56_000,
  creditAppliedCentavos: 0,
  amountDueCentavos: 56_000,
  state: "pending",
  // 14:05 in Bolivia.
  submittedAt: "2026-09-21T18:05:00.000Z",
  decidedAt: null,
  receiptAvailable: true,
  ...extra,
});

// Sofía pays Bs 500 after Bs 60 of referral Credit; Lucía pays in full.
export const sofiaPayment = paymentRow("01", "Sofía Guzmán", {
  creditAppliedCentavos: 6_000,
  amountDueCentavos: 50_000,
});
export const luciaPayment = paymentRow("02", "Lucía Fernández", {
  planName: "Mensual 16 clases",
  planPriceCentavos: 105_000,
  amountDueCentavos: 105_000,
  submittedAt: "2026-09-21T13:12:00.000Z",
});
export const valeriaPayment = paymentRow("03", "Valeria Quiroga", {
  state: "confirmed",
  decidedAt: "2026-09-20T15:00:00.000Z",
});
export const marianaPayment = paymentRow("04", "Mariana Paz", {
  state: "rejected",
  decidedAt: "2026-09-19T16:00:00.000Z",
  receiptAvailable: false,
});

export const paymentPage = (
  items: AdminPaymentDto[],
  extra: Partial<AdminPaymentPageDto> = {},
): AdminPaymentPageDto => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems: items.length,
  pendingCount: 6,
  ...extra,
});

export const reviewOf = (
  row: AdminPaymentDto,
  extra: Partial<PaymentReviewDto> = {},
): PaymentReviewDto => ({
  id: row.id,
  method: "transfer",
  state: row.state,
  planId: "7b000000-0000-5000-8000-000000000001",
  planName: row.planName,
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: row.planPriceCentavos,
  creditAppliedCentavos: row.creditAppliedCentavos,
  amountDueCentavos: row.amountDueCentavos,
  submittedAt: row.submittedAt,
  decidedAt: row.decidedAt ?? null,
  rejectionReason: null,
  subscriptionId: null,
  clientName: row.clientName,
  receipt: row.receiptAvailable
    ? {
        imageAssetId: "1a000000-0000-5000-8000-000000000001",
        mediaType: "image/jpeg",
      }
    : null,
  receiptUrl: row.receiptAvailable ? `${paymentsPath}/${row.id}/receipt` : null,
  ...extra,
});

// The sidebar's Pagos badge reads the pending count on every shell page
// (a one-row page of pending transfers); a spec overrides it to show one.
export const pendingBadgeHandler = (pendingCount = 0) =>
  http.get(apiUrl(paymentsPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get("status") !== "pending" || params.get("pageSize") !== "1") {
      return undefined;
    }
    return jsonResponse(
      paymentPage([], { pageSize: 1, totalItems: pendingCount, pendingCount }),
    );
  });
