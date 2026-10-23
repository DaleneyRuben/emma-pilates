// Stub so the red specs compile; the rules land in the next commit.
export const isValidPlanValidity = (plan: {
  durationDays: number;
  weeklyClassCap: number | null;
}): boolean => {
  throw new Error(`not implemented: ${plan.durationDays}`);
};

export const deprecatedDurationMonths = (durationDays: number): number => {
  throw new Error(`not implemented: ${durationDays}`);
};
