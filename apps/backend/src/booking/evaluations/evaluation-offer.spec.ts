import {
  includedEvaluationDays,
  evaluationOffer,
  planEvaluationOffer,
} from './evaluation-offer';

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

// Owner, 2026-11-27: Courtesy Access books an Evaluation, always paid at the
// studio price, even when its range is quarterly.
describe('the evaluation offer of Courtesy Access', () => {
  it('charges the settings price on a quarterly courtesy Plan', () => {
    expect(
      evaluationOffer({
        durationDays: 90,
        includedAlreadyUsed: false,
        priceCentavos: price,
        founderDiscountPercent: 15,
        courtesy: true,
      }),
    ).toEqual({ included: false, priceCentavos: price });
  });

  it('tells the header a courtesy Plan includes none', () => {
    expect(
      planEvaluationOffer(
        { durationDaysSnapshot: 90, evaluations: [], courtesy: true },
        price,
      ),
    ).toEqual({ includedEvaluation: 'none', priceCentavos: price });
    expect(
      planEvaluationOffer(
        { durationDaysSnapshot: 90, evaluations: [], courtesy: false },
        price,
      ),
    ).toEqual({ includedEvaluation: 'available', priceCentavos: price });
  });
});
