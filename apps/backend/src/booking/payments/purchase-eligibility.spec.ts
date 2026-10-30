import { evaluatePurchaseEligibility } from './purchase-eligibility';
import { PaymentRuleError } from './payment-errors';

const today = new Date('2026-09-22T00:00:00.000Z');
const plan = { hiddenAt: null, priceCentavos: 56_000 };
const baseline = {
  today,
  plan,
  activeSubscription: null,
  futureSubscriptionId: null,
  openPurchaseIntentId: null,
  pendingPaymentId: null,
};

const codeOf = (work: () => unknown): string | null => {
  try {
    work();
    return null;
  } catch (error) {
    return error instanceof PaymentRuleError ? error.code : 'unexpected';
  }
};

describe('evaluatePurchaseEligibility', () => {
  it('allows a purchase when nothing blocks it', () => {
    expect(evaluatePurchaseEligibility(baseline)).toEqual({
      subscriptionIdToExpire: null,
    });
  });

  it('refuses hidden, missing, and zero-price plans', () => {
    expect(
      codeOf(() => evaluatePurchaseEligibility({ ...baseline, plan: null })),
    ).toBe('plan_not_purchasable');
    expect(
      codeOf(() =>
        evaluatePurchaseEligibility({
          ...baseline,
          plan: { ...plan, hiddenAt: new Date('2026-09-01T00:00:00.000Z') },
        }),
      ),
    ).toBe('plan_not_purchasable');
    expect(
      codeOf(() =>
        evaluatePurchaseEligibility({
          ...baseline,
          plan: { ...plan, priceCentavos: 0 },
        }),
      ),
    ).toBe('plan_not_purchasable');
  });

  it('refuses while an open intent or a pending payment exists', () => {
    expect(
      codeOf(() =>
        evaluatePurchaseEligibility({
          ...baseline,
          openPurchaseIntentId: 'intent-1',
        }),
      ),
    ).toBe('purchase_intent_open_exists');
    expect(
      codeOf(() =>
        evaluatePurchaseEligibility({
          ...baseline,
          pendingPaymentId: 'payment-1',
        }),
      ),
    ).toBe('payment_pending_exists');
  });

  it('allows a renewal while the active subscription is still effective', () => {
    const effective = {
      id: 'subscription-1',
      startsOn: new Date('2026-09-01T00:00:00.000Z'),
      endsOn: new Date('2026-10-01T00:00:00.000Z'),
      remainingClassAllowance: 0,
      extraClasses: 0,
      futureBookedCount: 1,
      courtesy: false,
    };

    expect(
      evaluatePurchaseEligibility({
        ...baseline,
        activeSubscription: effective,
      }),
    ).toEqual({ subscriptionIdToExpire: null });
    expect(
      codeOf(() =>
        evaluatePurchaseEligibility({
          ...baseline,
          activeSubscription: effective,
          futureSubscriptionId: 'queued',
        }),
      ),
    ).toBe('future_subscription_exists');
  });

  it('asks the transaction to expire a subscription that no longer holds', () => {
    const byDate = {
      id: 'subscription-1',
      startsOn: new Date('2026-08-22T00:00:00.000Z'),
      endsOn: new Date('2026-09-21T00:00:00.000Z'),
      remainingClassAllowance: 5,
      extraClasses: 0,
      futureBookedCount: 0,
      courtesy: false,
    };
    const exhausted = {
      ...byDate,
      endsOn: new Date('2026-12-01T00:00:00.000Z'),
      remainingClassAllowance: 0,
    };

    expect(
      evaluatePurchaseEligibility({ ...baseline, activeSubscription: byDate }),
    ).toEqual({ subscriptionIdToExpire: 'subscription-1' });
    expect(
      evaluatePurchaseEligibility({
        ...baseline,
        activeSubscription: exhausted,
      }),
    ).toEqual({ subscriptionIdToExpire: null });
  });
});
