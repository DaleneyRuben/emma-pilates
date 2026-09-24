import { z } from "zod";
import { listSearchSchema } from "../components/table/pagination";

// AW26 and AW27: a Client's name is the lists' only filter (Referrals and
// Credit belong to the studio, not a Branch). The backend calls it `query`,
// ignores accents and case (STAFF-004), and caps it at 80 characters.
export const nameSearchSchema = listSearchSchema.extend({
  q: z.string().trim().min(1).max(80).optional().catch(undefined),
});
export type NameSearch = z.infer<typeof nameSearchSchema>;

export const nameSearchParams = (search: NameSearch) => ({
  page: search.page,
  pageSize: search.pageSize,
  ...(search.q === undefined ? {} : { query: search.q }),
});
