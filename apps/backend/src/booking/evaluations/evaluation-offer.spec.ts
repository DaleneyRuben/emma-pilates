import { includedEvaluationDays, evaluationOffer } from './evaluation-offer';

// NUT-003, booking ADR-0011: a Subscription of 90 days or longer includes one
// Evaluation inside its date range. Every other Client pays the settings price.
const price = 7_000;

describe('evaluation offer', () => {
  it('includes one Evaluation on a quarterly Plan and charges the settings price for a second', () => {
    expect(includedEvaluationDays).toBe(90);
    expect(
      evaluationOffer({
        durationDays: 90,
        includedAlreadyUsed: false,
        priceCentavos: price,
        founderDiscountPercent: 15,
      }),
    ).toEqual({ included: true, priceCentavos: 0 });
    expect(
      evaluationOffer({
        durationDays: 90,
        includedAlreadyUsed: true,
        priceCentavos: price,
        founderDiscountPercent: 15,
      }),
    ).toEqual({ included: false, priceCentavos: price });
  });

  it('charges the settings price for an 8-class Plan and never applies the Founder discount', () => {
    expect(
      evaluationOffer({
        durationDays: 30,
        includedAlreadyUsed: false,
        priceCentavos: price,
        founderDiscountPercent: 15,
      }),
    ).toEqual({ included: false, priceCentavos: price });
  });
});
