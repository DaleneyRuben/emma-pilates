import { z } from "zod";
import { listSearchSchema } from "../components/table/pagination";

export const feedbackStatusFilters = [
  "all",
  "new",
  "reviewed",
  "resolved",
] as const;
export const feedbackAppFilters = ["all", "client", "staff"] as const;
export type FeedbackStatusFilter = (typeof feedbackStatusFilters)[number];
export type FeedbackAppFilter = (typeof feedbackAppFilters)[number];

// AW38: every comment by default; the backend allows only these two filters
// (ADR-0062).
export const feedbackSearchSchema = listSearchSchema.extend({
  status: z.enum(feedbackStatusFilters).catch("all"),
  app: z.enum(feedbackAppFilters).catch("all"),
});
export type FeedbackSearch = z.infer<typeof feedbackSearchSchema>;
