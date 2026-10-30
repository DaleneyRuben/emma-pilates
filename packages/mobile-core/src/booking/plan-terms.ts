import { formatBolivianos } from "../money/bolivianos";

type PlanTerms = { classAllowance: number; durationDays: number; weeklyClassCap: number | null };

// booking ADR-0005 and ADR-0006: validity is always in days, never months,
// and the Weekly Cap appears only on the Plans that have one. Shared by the
// Client catalog (08, 09) and the Assistant's cash flow (S09, S10).
export function describeValidity(durationDays: number): string {
  return `Válido por ${durationDays} días`;
}

export function describeWeeklyCap(weeklyClassCap: number | null): string | null {
  return weeklyClassCap === null ? null : `Hasta ${weeklyClassCap} clases por semana`;
}

export function describePlanTerms(plan: PlanTerms): string {
  const classes = plan.classAllowance === 1 ? "1 clase" : `${plan.classAllowance} clases`;
  const terms = `${classes} · válido por ${plan.durationDays} días`;
  return plan.weeklyClassCap === null
    ? terms
    : `${terms} · hasta ${plan.weeklyClassCap} por semana`;
}

type PlanCardPrice = { name: string; priceCentavos: number; listPriceCentavos?: number };

// FIX-017: the card's accessibility label carries the price, and the founder
// price beside the list price, because VoiceOver and Maestro read only the
// label (a hint is skipped when hints are off). Client 08 and Assistant S09.
export function describePlanCardLabel(plan: PlanCardPrice): string {
  const price = formatBolivianos(plan.priceCentavos);
  return plan.listPriceCentavos === undefined
    ? `${plan.name}, ${price}`
    : `${plan.name}, ${price}, antes ${formatBolivianos(plan.listPriceCentavos)}`;
}
