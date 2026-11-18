import { z } from "zod";
import { listSearchSchema } from "../../components/table/pagination";

// AW31: a Bolivia month (the current one when absent), optionally one
// Supply, and optionally one kind of movement (both kinds when absent), the
// backend's allowlist (ADR-0062); the address owns all three.
export const withdrawalSearchSchema = listSearchSchema.extend({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
  supplyId: z.uuid().optional().catch(undefined),
  kind: z.enum(["withdrawal", "restock"]).optional().catch(undefined),
});
export type WithdrawalSearch = z.infer<typeof withdrawalSearchSchema>;
