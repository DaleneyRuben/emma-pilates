// A spent gift is a grant plus a consumption. Eligibility uses the net sum,
// not whether any positive adjustment still exists (H13).
export const netAllowanceClasses = (
  adjustments: readonly { classes: number }[],
): number =>
  adjustments.reduce((sum, adjustment) => sum + adjustment.classes, 0);

export const hasSpendableExtra = (
  adjustments: readonly { classes: number }[],
): boolean => netAllowanceClasses(adjustments) > 0;
