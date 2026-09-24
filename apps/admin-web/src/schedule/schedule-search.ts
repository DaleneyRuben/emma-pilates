import { z } from "zod";

// ADR-0042: the week on screen is navigation state, so it lives in the URL
// (`?week=2026-09-28`, the Monday); no week means the current Bolivia week.
export const scheduleSearchSchema = z.object({
  week: z.iso.date().optional().catch(undefined),
});

export type ScheduleSearch = z.infer<typeof scheduleSearchSchema>;
