import { type RollingLimit, rollingBudgetWaitSeconds } from './rolling-budget';

const minuteMilliseconds = 60 * 1_000;
const hourMilliseconds = 60 * minuteMilliseconds;
const dayMilliseconds = 24 * hourMilliseconds;

// ADR-0029 recipient-and-purpose lane for verification and activation email:
// one a minute, five in a rolling hour, ten in a rolling day.
const limits: RollingLimit[] = [
  { windowMilliseconds: minuteMilliseconds, allowed: 1 },
  { windowMilliseconds: hourMilliseconds, allowed: 5 },
  { windowMilliseconds: dayMilliseconds, allowed: 10 },
];

/** Seconds until the recipient may receive another email, or 0. */
export const authenticationEmailWaitSeconds = (
  events: readonly { occurredAt: Date }[],
  now: Date,
): number =>
  rollingBudgetWaitSeconds(
    events.map(({ occurredAt }) => occurredAt),
    now,
    limits,
  );
