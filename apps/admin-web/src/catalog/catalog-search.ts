import { z } from "zod";
import { listSearchSchema } from "../components/table/pagination";

export const catalogStatuses = ["active", "archived", "all"] as const;
export type CatalogStatus = (typeof catalogStatuses)[number];

// Branches and Class Types: archived rows keep their history and appear only
// when asked for (ADR-0062 allowlist, the same values the backend accepts).
export const catalogStatusSearchSchema = listSearchSchema.extend({
  status: z.enum(catalogStatuses).catch("active"),
});
export type CatalogStatusSearch = z.infer<typeof catalogStatusSearchSchema>;

export const planVisibilities = ["all", "visible", "hidden"] as const;
export type PlanVisibility = (typeof planVisibilities)[number];

export const planSearchSchema = listSearchSchema.extend({
  visibility: z.enum(planVisibilities).catch("all"),
});
export type PlanSearch = z.infer<typeof planSearchSchema>;

/** A list page changes its search through the router, never local state. */
export type SearchChange<Search> = (change: Partial<Search>) => void;
