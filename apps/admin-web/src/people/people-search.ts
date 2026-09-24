import { z } from "zod";
import { listSearchSchema } from "../components/table/pagination";

// AW21: search is the directory's only filter (Clients have no Branch); the
// backend ignores accents and case (STAFF-004) and caps it at 100 characters.
export const clientSearchSchema = listSearchSchema.extend({
  q: z.string().trim().min(1).max(100).optional().catch(undefined),
});
export type ClientSearch = z.infer<typeof clientSearchSchema>;
