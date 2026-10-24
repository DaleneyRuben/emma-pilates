import { decideGiftClass } from './gift-class';

// BKM-008, decisions §5.2: one extra class on the first real Subscription of
// a Client's life, never for a founder, never for Courtesy Access.
const realPlan = {
  method: 'cash' as const,
  hidden: false,
  priceCentavos: 59_000,
};

describe('decideGiftClass', () => {
  it('gives one class on the first real Payment of a Client who is not a founder', () => {
    expect(
      decideGiftClass({
        founder: false,
        earlierRealPayment: false,
        payment: realPlan,
      }),
    ).toEqual({ classes: 1, reason: 'gift_new_client' });
  });

  it('gives nothing when the same confirmation is retried', () => {
    expect(
      decideGiftClass({
        founder: false,
        earlierRealPayment: true,
        payment: realPlan,
      }),
    ).toBeNull();
  });

  it('gives nothing to a founder', () => {
    expect(
      decideGiftClass({
        founder: true,
        earlierRealPayment: false,
        payment: realPlan,
      }),
    ).toBeNull();
  });

  it('treats a courtesy Payment as not a first Plan', () => {
    expect(
      decideGiftClass({
        founder: false,
        earlierRealPayment: false,
        payment: { method: 'courtesy', hidden: true, priceCentavos: 0 },
      }),
    ).toBeNull();
  });

  it('treats a hidden Plan as not a first Plan', () => {
    expect(
      decideGiftClass({
        founder: false,
        earlierRealPayment: false,
        payment: { method: 'cash', hidden: true, priceCentavos: 59_000 },
      }),
    ).toBeNull();
  });
});
