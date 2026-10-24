import { decideRenewal } from './early-renewal';
import { PaymentRuleError } from './payment-errors';

const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);
const today = civil('2026-10-23');
const day = 24 * 60 * 60 * 1_000;

const current = {
  id: 'current',
  startsOn: civil('2026-10-01'),
  endsOn: new Date(today.getTime() + 2 * day),
  remainingClassAllowance: 2,
  futureBookedCount: 0,
};

// booking ADR-0005: one future Subscription. Classes left queue it the day
// after the current end; none left starts it on the chosen date and ends
// the current one the day before.
describe('decideRenewal', () => {
  it('starts the day after the current end while classes remain', () => {
    expect(
      decideRenewal({
        today,
        current,
        futureSubscriptionId: null,
        requested: today,
      }),
    ).toEqual({
      startsOn: civil('2026-10-26'),
      chosen: false,
      subscriptionIdToEndEarly: null,
    });
  });

  it('counts a future booked Session as a class still held', () => {
    expect(
      decideRenewal({
        today,
        current: {
          ...current,
          remainingClassAllowance: 0,
          futureBookedCount: 1,
        },
        futureSubscriptionId: null,
        requested: today,
      }).startsOn,
    ).toEqual(civil('2026-10-26'));
  });

  it('starts on the chosen date and ends the current Subscription the day before when nothing is left', () => {
    expect(
      decideRenewal({
        today,
        current: {
          ...current,
          endsOn: new Date(today.getTime() + 9 * day),
          remainingClassAllowance: 0,
        },
        futureSubscriptionId: null,
        requested: today,
      }),
    ).toEqual({
      startsOn: today,
      chosen: true,
      subscriptionIdToEndEarly: 'current',
      endsOn: civil('2026-10-22'),
    });
  });

  it('refuses a second future Subscription', () => {
    let caught: unknown = null;
    try {
      decideRenewal({
        today,
        current,
        futureSubscriptionId: 'already-queued',
        requested: null,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(PaymentRuleError);
    expect(caught instanceof PaymentRuleError ? caught.code : null).toBe(
      'future_subscription_exists',
    );
  });
});
