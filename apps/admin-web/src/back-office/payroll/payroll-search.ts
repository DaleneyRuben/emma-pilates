import { z } from "zod";
import { listSearchSchema } from "../../components/table/pagination";

// AW11: one Staff Member at a time, "Todos" by default (ADR-0062 allowlist).
export const payrollSearchSchema = listSearchSchema.extend({
  staffMemberId: z.uuid().optional().catch(undefined),
});
export type PayrollSearch = z.infer<typeof payrollSearchSchema>;
