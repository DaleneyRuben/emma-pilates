export type SubscriptionDurationMonths = 1 | 3 | 6 | 12;

export type SubscriptionTerm = { startsOn: Date; endsOn: Date };

// Dates are Bolivia civil dates encoded at UTC midnight. The paid-through day
// is the same day of month after the snapshotted months, clamped to the last
// day when that month is shorter (January 31 + 1 month = February 28).
export const computeSubscriptionTerm = (
  startsOn: Date,
  durationMonths: SubscriptionDurationMonths,
): SubscriptionTerm => {
  const year = startsOn.getUTCFullYear();
  const monthIndex = startsOn.getUTCMonth() + durationMonths;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(year, monthIndex + 1, 0),
  ).getUTCDate();
  const day = Math.min(startsOn.getUTCDate(), lastDayOfTargetMonth);

  return { startsOn, endsOn: new Date(Date.UTC(year, monthIndex, day)) };
};
