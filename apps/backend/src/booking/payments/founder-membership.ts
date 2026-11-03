// booking ADR-0008: 15 % off every Plan except the single class, for the
// first 40 Clients, lost for good after a gap of more than the allowed days.

const dayMilliseconds = 24 * 60 * 60 * 1_000;
const singleClassAllowance = 1;

// Uncovered days are the days after the real end and before the next start.
// A gap of exactly the allowed days keeps the membership (FIX-001).
export const uncoveredDays = (realEnd: Date, next: Date): number =>
  (next.getTime() - realEnd.getTime()) / dayMilliseconds - 1;

export type FounderRules = {
  founderPlaces: number;
  founderDiscountPercent: number;
  founderGapDays: number;
};

export type FounderStatus = 'active' | 'lost';

export type FounderMembershipFlag = { status: FounderStatus } | null;

// The seam BKM-008 calls. A lost membership is not a founder.
export const isFounder = (membership: FounderMembershipFlag): boolean =>
  membership?.status === 'active';

const centavosPerBoliviano = 100;

// The studio charges whole bolivianos (FIX-025, owner 2026-11-02): the
// discounted price is rounded to the nearest boliviano, ,50 up, and the
// discount is the rest of the list price. Computed once and stored on the
// Payment, so the quote, the QR amount, and the cash close agree.
export const founderDiscount = (input: {
  classAllowance: number;
  priceCentavos: number;
  percent: number;
}): { discountCentavos: number; amountDueCentavos: number } => {
  if (input.classAllowance <= singleClassAllowance) {
    return { discountCentavos: 0, amountDueCentavos: input.priceCentavos };
  }
  const amountDueCentavos =
    Math.round(
      (input.priceCentavos * (100 - input.percent)) /
        (100 * centavosPerBoliviano),
    ) * centavosPerBoliviano;
  return {
    discountCentavos: input.priceCentavos - amountDueCentavos,
    amountDueCentavos,
  };
};

export type HeldFounderPlace = 'active' | 'reserved' | 'lost' | 'none';

// One answer for the quote and the sale, so what a Client sees is what she
// pays. A held place keeps the price on every Plan, from the first one on; a
// lost one never comes back; a Client who already bought a real Plan without
// a place cannot take one later. Only a first Plan needs a free place.
export const founderPriceFrom = (input: {
  held: HeldFounderPlace;
  earlierPlanPayment: boolean;
}): 'founder' | 'list' | 'needs-place' => {
  if (input.held === 'active') return 'founder';
  if (input.held === 'lost') return 'list';
  if (input.earlierPlanPayment) return 'list';
  return input.held === 'reserved' ? 'founder' : 'needs-place';
};

export const decideFounderPlace = (input: {
  places: number;
  assigned: number;
  nextNumber: number;
  alreadyHeld: boolean;
  courtesy: boolean;
}): { assign: false } | { assign: true; number: number } => {
  if (input.courtesy || input.alreadyHeld || input.assigned >= input.places) {
    return { assign: false };
  }
  return { assign: true, number: input.nextNumber };
};

export const decideFounderGap = (input: {
  today: Date;
  rules: FounderRules;
  membership: { status: FounderStatus; lostAt: Date | null };
  latestRealEnd: Date | null;
  nextStart: Date | null;
}): { lose: false } | { lose: true; reason: 'gap' } => {
  if (input.membership.status === 'lost' || input.latestRealEnd === null) {
    return { lose: false };
  }
  const coveredUntil = input.nextStart === null ? input.today : input.nextStart;
  return uncoveredDays(input.latestRealEnd, coveredUntil) >
    input.rules.founderGapDays
    ? { lose: true, reason: 'gap' }
    : { lose: false };
};

// The shown price is the discounted one. The list price travels beside it
// only when a discount applies, so older builds keep reading priceCentavos.
export const priceFounderPlans = <
  T extends {
    classAllowance: number;
    priceCentavos: number;
  },
>(
  plans: T[],
  input: { founder: boolean; percent: number },
): Array<T & { listPriceCentavos?: number }> =>
  plans.map((plan) => {
    if (!input.founder) return plan;
    const priced = founderDiscount({
      classAllowance: plan.classAllowance,
      priceCentavos: plan.priceCentavos,
      percent: input.percent,
    });
    if (priced.discountCentavos === 0) return plan;
    return {
      ...plan,
      priceCentavos: priced.amountDueCentavos,
      listPriceCentavos: plan.priceCentavos,
    };
  });

export const founderRenewalDeadline = (
  realEnd: Date,
  rules: Pick<FounderRules, 'founderGapDays'>,
): Date =>
  new Date(realEnd.getTime() + (rules.founderGapDays + 1) * dayMilliseconds);
