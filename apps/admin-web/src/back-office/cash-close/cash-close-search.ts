import { z } from "zod";

// AW151: a Bolivia month (the current one when absent) in the address.
export const cashCloseSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
});
export type CashCloseSearch = z.infer<typeof cashCloseSearchSchema>;
