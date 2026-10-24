import { z } from "zod";
import { listSearchSchema } from "../components/table/pagination";

// AW21: search is the directory's only filter (Clients have no Branch); the
// backend ignores accents and case (STAFF-004) and caps it at 100 characters.
export const clientSearchSchema = listSearchSchema.extend({
  q: z.string().trim().min(1).max(100).optional().catch(undefined),
});
export type ClientSearch = z.infer<typeof clientSearchSchema>;

export const staffRoles = [
  "trainer",
  "assistant",
  "administrator",
  "nutritionist",
  "coordinator",
] as const;

/** Administrators and the Coordinator hold every Branch implicitly. */
export const holdsEveryBranch = (role: unknown): boolean =>
  role === "administrator" || role === "coordinator";
export type StaffRole = (typeof staffRoles)[number];

// AW23: one Role at a time, "Todos" by default (ADR-0062 allowlist).
export const staffSearchSchema = listSearchSchema.extend({
  role: z.enum(["all", ...staffRoles]).catch("all"),
});
export type StaffSearch = z.infer<typeof staffSearchSchema>;
