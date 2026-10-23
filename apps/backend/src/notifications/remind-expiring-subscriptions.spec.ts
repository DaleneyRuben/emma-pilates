import {
  remindExpiringSubscriptions,
  subscriptionEndsWithinReminderWindow,
} from './remind-expiring-subscriptions';

const today = new Date('2026-09-21T00:00:00.000Z');

describe('remindExpiringSubscriptions', () => {
  it('records one reminder per Subscription ending within three days and not yet reminded', async () => {
    const findSubscriptionsEndingWithin = jest.fn().mockResolvedValue([
      { id: 'subscription-1', accountId: 'account-1' },
      { id: 'subscription-2', accountId: 'account-2' },
    ]);
    const record = jest.fn().mockResolvedValue(undefined);

    await expect(
      remindExpiringSubscriptions({
        today,
        findSubscriptionsEndingWithin,
        record,
      }),
    ).resolves.toEqual({ reminded: 2 });

    expect(findSubscriptionsEndingWithin).toHaveBeenCalledWith(today);
    expect(record).toHaveBeenCalledWith({
      accountId: 'account-1',
      category: 'reminder',
      type: 'subscription_expiring',
      businessEventKey: 'subscription-expiring:subscription-1',
      title: 'Plan por vencer',
      message: 'Tu plan vence en 3 días.',
      destination: { type: 'subscription', id: 'subscription-1' },
      occurredAt: today,
    });
  });

  it('includes a Subscription that ends today or within three days and has no reminder yet', () => {
    const endingInThreeDays = new Date('2026-09-24T00:00:00.000Z');
    const endingTomorrow = new Date('2026-09-22T00:00:00.000Z');
    const endingToday = new Date('2026-09-21T00:00:00.000Z');
    const endingInFourDays = new Date('2026-09-25T00:00:00.000Z');
    const alreadyEnded = new Date('2026-09-20T00:00:00.000Z');

    expect(subscriptionEndsWithinReminderWindow(endingInThreeDays, today)).toBe(
      true,
    );
    expect(subscriptionEndsWithinReminderWindow(endingTomorrow, today)).toBe(
      true,
    );
    expect(subscriptionEndsWithinReminderWindow(endingToday, today)).toBe(true);
    expect(subscriptionEndsWithinReminderWindow(endingInFourDays, today)).toBe(
      false,
    );
    expect(subscriptionEndsWithinReminderWindow(alreadyEnded, today)).toBe(
      false,
    );
  });

  it('does nothing when no Subscription ends within three days', async () => {
    const record = jest.fn();

    await expect(
      remindExpiringSubscriptions({
        today,
        findSubscriptionsEndingWithin: jest.fn().mockResolvedValue([]),
        record,
      }),
    ).resolves.toEqual({ reminded: 0 });
    expect(record).not.toHaveBeenCalled();
  });
});
