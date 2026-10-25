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
