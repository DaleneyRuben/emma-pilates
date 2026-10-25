import { z } from "zod";
import { defaultReportRange } from "./report-range";

// AW16's criteria live in the address (ADR-0042): "all" or one Branch, and
// an inclusive range of Bolivia civil dates (ADR-0057).
export const reportSearchSchema = z.object({
  branch: z.union([z.literal("all"), z.uuid()]).catch("all"),
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  // Follow-up 201: Reporte stays the page; Finanzas is the month result.
  vista: z.enum(["reporte", "finanzas"]).catch("reporte"),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
});
export type ReportSearch = z.infer<typeof reportSearchSchema>;

export type ReportRange = { from: string; to: string };

/** The range on screen: the address's, or the default when it is incomplete or backwards. */
export function resolveReportRange(
  search: ReportSearch,
  today: string,
): ReportRange {
  const fallback = defaultReportRange(today);
  const from = search.from ?? fallback.from;
  const to = search.to ?? fallback.to;
  return from <= to ? { from, to } : fallback;
}
