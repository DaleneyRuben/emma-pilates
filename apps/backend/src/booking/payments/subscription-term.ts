export type SubscriptionTerm = { startsOn: Date; endsOn: Date };

const dayMilliseconds = 24 * 60 * 60 * 1000;

// Dates are Bolivia civil dates encoded at UTC midnight. The Start Date is
// the first of the snapshotted days, so the end is the start plus the days
// minus one (booking ADR-0005).
export const computeSubscriptionTerm = (
  startsOn: Date,
  durationDays: number,
): SubscriptionTerm => ({
  startsOn,
  endsOn: new Date(startsOn.getTime() + (durationDays - 1) * dayMilliseconds),
});
