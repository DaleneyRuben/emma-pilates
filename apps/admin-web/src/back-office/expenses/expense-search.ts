import { z } from "zod";
import { listSearchSchema } from "../../components/table/pagination";

// AW13: one Expense Category at a time, "Todas" by default (ADR-0062).
// FIX-091 (W11 B): a Bolivia month (the current one when absent), and
// «borrados» for the month's eliminated Expenses instead of the standing.
export const expenseSearchSchema = listSearchSchema.extend({
  expenseCategoryId: z.uuid().optional().catch(undefined),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
  borrados: z.literal(true).optional().catch(undefined),
});
export type ExpenseSearch = z.infer<typeof expenseSearchSchema>;
