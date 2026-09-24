import { z } from "zod";
import { listSearchSchema } from "../../components/table/pagination";

// AW25: a Bolivia week (its Monday; the current one when absent) and
// optionally one Nutritionist, the backend's allowlist (ADR-0062); the
// address owns both (ADR-0042). The Branch comes from the shell selector.
export const evaluationSearchSchema = listSearchSchema.extend({
  week: z.iso.date().optional().catch(undefined),
  nutritionistStaffMemberId: z.uuid().optional().catch(undefined),
});
export type EvaluationSearch = z.infer<typeof evaluationSearchSchema>;
