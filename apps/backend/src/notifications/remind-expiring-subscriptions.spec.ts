import { remindExpiringSubscriptions } from './remind-expiring-subscriptions';

const today = new Date('2026-09-21T00:00:00.000Z');

describe('remindExpiringSubscriptions', () => {
  it('records one reminder per Subscription ending in three days', async () => {
    const findSubscriptionsEndingOn = jest.fn().mockResolvedValue([
      { id: 'subscription-1', accountId: 'account-1' },
      { id: 'subscription-2', accountId: 'account-2' },
    ]);
    const record = jest.fn().mockResolvedValue(undefined);

    await expect(
      remindExpiringSubscriptions({
        today,
        findSubscriptionsEndingOn,
        record,
      }),
    ).resolves.toEqual({ reminded: 2 });

    expect(findSubscriptionsEndingOn).toHaveBeenCalledWith(
      new Date('2026-09-24T00:00:00.000Z'),
    );
    expect(record).toHaveBeenCalledWith({
      accountId: 'account-1',
      category: 'reminder',
      type: 'subscription_expiring',
      businessEventKey: 'subscription-expiring:subscription-1',
      title: 'Plan por vencer',
      message:
        'Tu plan vence en 3 días. Renueva cuando quieras y elige tu fecha de inicio.',
      destination: { type: 'subscription', id: 'subscription-1' },
      occurredAt: today,
    });
  });

  it('does nothing when no Subscription ends in three days', async () => {
    const record = jest.fn();

    await expect(
      remindExpiringSubscriptions({
        today,
        findSubscriptionsEndingOn: jest.fn().mockResolvedValue([]),
        record,
      }),
    ).resolves.toEqual({ reminded: 0 });
    expect(record).not.toHaveBeenCalled();
  });
});
