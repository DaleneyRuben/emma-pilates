import { useGetCurrentPayment, type PaymentDto } from "@pilates/api-contracts";

/**
 * Where the Client's last Plan Payment stands (follow-up 246): a transfer in
 * review or a rejected receipt is a state of its own, so the app shows it
 * instead of inviting a purchase the server refuses (`payment_pending_exists`).
 * A confirmed or voided Payment, or none at all, leaves the app as it was.
 */
export type PaymentStanding =
  | { kind: "none" }
  | { kind: "in_review"; payment: PaymentDto }
  | { kind: "rejected"; payment: PaymentDto };

export function paymentStandingOf(payment: PaymentDto | undefined): PaymentStanding {
  if (payment?.state === "pending") return { kind: "in_review", payment };
  if (payment?.state === "rejected") return { kind: "rejected", payment };
  return { kind: "none" };
}

/**
 * Reads `GET /payments/current`; a 404 (no Payment yet) or a failure is «none».
 * `pending` is true only while the first read is in flight: offline, the read
 * pauses and Inicio must still render from its cached answers (FIX-011).
 */
export function usePaymentStanding(fetcher: typeof globalThis.fetch) {
  const current = useGetCurrentPayment({ fetcher, query: { refetchOnMount: "always" } });
  const payment = current.data?.status === 200 ? current.data.data : undefined;
  return { pending: current.isLoading, standing: paymentStandingOf(payment) };
}
