import { courtesyAccessPlan, evaluateCourtesyGrant } from './courtesy-access';
import { PaymentRuleError } from './payment-errors';

const today = new Date('2026-10-23T00:00:00.000Z');
const day = 24 * 60 * 60 * 1_000;
const baseline = {
  today,
  endsOn: new Date(today.getTime() + 29 * day),
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

describe('evaluateCourtesyGrant', () => {
  it('describes the hidden tester Plan of 16 classes valid for 30 days', () => {
    expect(courtesyAccessPlan).toEqual({
      name: 'Acceso de prueba',
      classAllowance: 16,
      durationDays: 30,
      priceCentavos: 0,
    });
  });

  it('grants access until today or a date within a year', () => {
    expect(evaluateCourtesyGrant(baseline)).toEqual({
      subscriptionIdToExpire: null,
    });
    expect(evaluateCourtesyGrant({ ...baseline, endsOn: today })).toEqual({
      subscriptionIdToExpire: null,
    });
    expect(
      evaluateCourtesyGrant({
        ...baseline,
        endsOn: new Date(today.getTime() + 365 * day),
      }),
    ).toEqual({ subscriptionIdToExpire: null });
  });

  it('refuses an end date in the past or more than a year ahead', () => {
    expect(
      codeOf(() =>
        evaluateCourtesyGrant({
          ...baseline,
          endsOn: new Date(today.getTime() - day),
        }),
      ),
    ).toBe('courtesy_end_date_invalid');
    expect(
      codeOf(() =>
        evaluateCourtesyGrant({
          ...baseline,
          endsOn: new Date(today.getTime() + 366 * day),
        }),
      ),
    ).toBe('courtesy_end_date_invalid');
  });

  it('refuses a grant while a Plan is still effective, and a second future one, a pending payment, or an open intent', () => {
    const current = {
      id: 'current',
      startsOn: today,
      endsOn: new Date(today.getTime() + 5 * day),
      remainingClassAllowance: 3,
      futureBookedCount: 0,
    };
    expect(
      codeOf(() =>
        evaluateCourtesyGrant({ ...baseline, activeSubscription: current }),
      ),
    ).toBe('subscription_not_expired');
    expect(
      codeOf(() =>
        evaluateCourtesyGrant({
          ...baseline,
          activeSubscription: current,
          futureSubscriptionId: 'queued',
        }),
      ),
    ).toBe('future_subscription_exists');
    expect(
      codeOf(() =>
        evaluateCourtesyGrant({ ...baseline, pendingPaymentId: 'pending' }),
      ),
    ).toBe('payment_pending_exists');
    expect(
      codeOf(() =>
        evaluateCourtesyGrant({ ...baseline, openPurchaseIntentId: 'open' }),
      ),
    ).toBe('purchase_intent_open_exists');
  });

  it('expires a Subscription that no longer holds', () => {
    expect(
      evaluateCourtesyGrant({
        ...baseline,
        activeSubscription: {
          id: 'spent',
          startsOn: today,
          endsOn: new Date(today.getTime() + 5 * day),
          remainingClassAllowance: 0,
          futureBookedCount: 0,
        },
      }),
    ).toEqual({ subscriptionIdToExpire: null });
  });
});
