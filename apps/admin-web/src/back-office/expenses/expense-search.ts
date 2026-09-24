import { z } from "zod";
import { listSearchSchema } from "../../components/table/pagination";

// AW13: one Expense Category at a time, "Todas" by default (ADR-0062).
export const expenseSearchSchema = listSearchSchema.extend({
  expenseCategoryId: z.uuid().optional().catch(undefined),
});
export type ExpenseSearch = z.infer<typeof expenseSearchSchema>;
