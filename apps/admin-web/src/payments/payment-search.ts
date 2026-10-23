import { z } from "zod";
import { listSearchSchema } from "../components/table/pagination";

export const paymentStatuses = [
  "all",
  "pending",
  "confirmed",
  "rejected",
  "voided",
] as const;
export type PaymentStatusFilter = (typeof paymentStatuses)[number];

// AW28: the Estado filter starts on Pendiente (the review queue) and the
// search looks for the Client's name (ADR-0062, the backend's allowlist).
export const paymentSearchSchema = listSearchSchema.extend({
  status: z.enum(paymentStatuses).catch("pending"),
  q: z.string().trim().min(1).max(100).optional().catch(undefined),
});
export type PaymentSearch = z.infer<typeof paymentSearchSchema>;
