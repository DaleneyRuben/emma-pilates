import {
  type RollingLimit,
  rollingBudgetWaitSeconds,
} from '../security/rolling-budget';

/** The email a budgeted staff command would send. */
export type StaffEmailPurpose = 'activation' | 'verification';

export const staffEmailDayMilliseconds = 24 * 60 * 60 * 1_000;

// BE-013 T3: one budget per Account for every staff-initiated email.
const accountLimits: RollingLimit[] = [
  { windowMilliseconds: 15 * 60 * 1_000, allowed: 20 },
  { windowMilliseconds: staffEmailDayMilliseconds, allowed: 100 },
];

/** Seconds until the Account may make another request, or 0. */
export const staffEmailWaitSeconds = (
  occurredAt: readonly Date[],
  now: Date,
): number => rollingBudgetWaitSeconds(occurredAt, now, accountLimits);
