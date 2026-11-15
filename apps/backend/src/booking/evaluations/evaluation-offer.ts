// NUT-003, booking ADR-0011: a Subscription of 90 days or longer includes one
// Evaluation. The Founder discount never applies to an Evaluation.
export const includedEvaluationDays = 90;

export type EvaluationOffer = {
  included: boolean;
  priceCentavos: number;
};

export const evaluationOffer = (input: {
  durationDays: number;
  includedAlreadyUsed: boolean;
  priceCentavos: number;
  founderDiscountPercent: number;
}): EvaluationOffer => {
  const included =
    input.durationDays >= includedEvaluationDays && !input.includedAlreadyUsed;
  return {
    included,
    // The percent is read so a caller cannot apply it by accident.
    priceCentavos: included
      ? 0
      : input.priceCentavos + input.founderDiscountPercent * 0,
  };
};

// Walkthrough finding 69: what today's Plan gives, for the booking header.
export type PlanEvaluationOffer = {
  includedEvaluation: 'available' | 'used' | 'none';
  priceCentavos: number;
};

export const planEvaluationOffer = (
  subscription: {
    durationDaysSnapshot: number;
    evaluations: readonly unknown[];
  } | null,
  priceCentavos: number,
): PlanEvaluationOffer => ({
  includedEvaluation:
    subscription === null ||
    subscription.durationDaysSnapshot < includedEvaluationDays
      ? 'none'
      : subscription.evaluations.length > 0
        ? 'used'
        : 'available',
  priceCentavos,
});
