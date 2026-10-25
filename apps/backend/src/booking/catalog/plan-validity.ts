// booking ADR-0005 and ADR-0006: a Plan lasts 30, 60, or 90 days, and only
// the 60- and 90-day Plans may carry a Weekly Cap of 3 or 4 Bookings.
export const planDurationDays = [30, 60, 90] as const;
export const weeklyClassCaps = [3, 4] as const;

export type PlanDurationDays = (typeof planDurationDays)[number];
export type WeeklyClassCap = (typeof weeklyClassCaps)[number];

const isOneOf = <Value extends number>(
  values: readonly Value[],
  value: number,
): value is Value => (values as readonly number[]).includes(value);

export const isValidPlanValidity = (plan: {
  durationDays: number;
  weeklyClassCap: number | null;
}): boolean =>
  isOneOf(planDurationDays, plan.durationDays) &&
  (plan.weeklyClassCap === null ||
    (plan.durationDays > 30 && isOneOf(weeklyClassCaps, plan.weeklyClassCap)));

// ADR-0016: store builds still read `durationMonths`; 30, 60, and 90 days
// read as 1, 2, and 3 months there.
export const deprecatedDurationMonths = (durationDays: number): number =>
  Math.round(durationDays / 30);
