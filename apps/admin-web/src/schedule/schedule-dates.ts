import type { AdminSessionScheduleDto } from "@pilates/api-contracts";
import { addDays } from "../lib/bolivia-time";

/**
 * The first date a change may take effect: today or later and after the
 * schedule started (the backend's `effective_date_invalid` rule).
 */
export const firstChangeDate = (
  schedule: AdminSessionScheduleDto,
  today: string,
): string => {
  const afterStart = addDays(schedule.effectiveFrom, 1);
  return afterStart > today ? afterStart : today;
};
