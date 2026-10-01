import {
  type RollingLimit,
  rollingBudgetWaitSeconds,
} from '../security/rolling-budget';

/** Registration, resend, and correction share one budget; recovery has its own. */
export type EmailBudgetGroup = 'verification' | 'password_recovery';

export type EmailSourceEvents = {
  /** Null when the request carried no valid client identifier. */
  client: readonly Date[] | null;
  network: readonly Date[];
};

const quarterHourMilliseconds = 15 * 60 * 1_000;
export const emailSourceDayMilliseconds = 24 * 60 * 60 * 1_000;

const lane = (perQuarterHour: number, perDay: number): RollingLimit[] => [
  { windowMilliseconds: quarterHourMilliseconds, allowed: perQuarterHour },
  { windowMilliseconds: emailSourceDayMilliseconds, allowed: perDay },
];

// BE-012 S3/S4: the network lane is five times looser than the client lane,
// because carrier NAT and the studio Wi-Fi put many people behind one address.
const budgets: Record<
  EmailBudgetGroup,
  { client: RollingLimit[]; network: RollingLimit[] }
> = {
  verification: { client: lane(10, 30), network: lane(50, 200) },
  password_recovery: { client: lane(5, 10), network: lane(25, 100) },
};

/** Seconds until the source may make another request, or 0. */
export const emailSourceWaitSeconds = (
  group: EmailBudgetGroup,
  events: EmailSourceEvents,
  now: Date,
): number =>
  Math.max(
    events.client === null
      ? 0
      : rollingBudgetWaitSeconds(events.client, now, budgets[group].client),
    rollingBudgetWaitSeconds(events.network, now, budgets[group].network),
  );
