type PlanTerms = { classAllowance: number; durationDays: number; weeklyClassCap: number | null };

// Placeholder for the red specs; the copy lands in the next commit.
export function describeValidity(durationDays: number): string {
  return String(durationDays);
}

export function describeWeeklyCap(weeklyClassCap: number | null): string | null {
  return weeklyClassCap === null ? "" : String(weeklyClassCap);
}

export function describePlanTerms(plan: PlanTerms): string {
  return String(plan.classAllowance);
}
