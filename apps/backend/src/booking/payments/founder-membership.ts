// booking ADR-0008: 15 % off every Plan except the single class, for the
// first 40 Clients, lost for good after a gap of more than the allowed days.

const dayMilliseconds = 24 * 60 * 60 * 1_000;
const singleClassAllowance = 1;

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

// Half up to the nearest centavo, computed once and stored on the Payment.
export const founderDiscount = (input: {
  classAllowance: number;
  priceCentavos: number;
  percent: number;
}): { discountCentavos: number; amountDueCentavos: number } => {
  if (input.classAllowance <= singleClassAllowance) {
    return { discountCentavos: 0, amountDueCentavos: input.priceCentavos };
  }
  const discountCentavos = Math.round(
    (input.priceCentavos * input.percent) / 100,
  );
  return {
    discountCentavos,
    amountDueCentavos: input.priceCentavos - discountCentavos,
  };
};

export const decideFounderPlace = (input: {
  places: number;
  assigned: number;
  alreadyHeld: boolean;
  courtesy: boolean;
}): { assign: false } | { assign: true; number: number } => {
  if (input.courtesy || input.alreadyHeld || input.assigned >= input.places) {
    return { assign: false };
  }
  return { assign: true, number: input.assigned + 1 };
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
  const gapDays =
    (coveredUntil.getTime() - input.latestRealEnd.getTime()) / dayMilliseconds;
  return gapDays > input.rules.founderGapDays
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
): Date => new Date(realEnd.getTime() + rules.founderGapDays * dayMilliseconds);
