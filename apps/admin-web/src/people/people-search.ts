import { z } from "zod";
import { listSearchSchema } from "../components/table/pagination";

/** Clientas › Todas's chips after «Todas» (follow-up 232, WEB-040). */
export const clientFilters = ["active", "none", "expired", "founder"] as const;
export type ClientFilter = (typeof clientFilters)[number];

// AW21: a search (Clients have no Branch) and one chip; «Todas» leaves the
// chip out of the address. The backend ignores accents and case (STAFF-004)
// and caps the search at 100 characters.
export const clientSearchSchema = listSearchSchema.extend({
  q: z.string().trim().min(1).max(100).optional().catch(undefined),
  filter: z.enum(clientFilters).optional().catch(undefined),
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
