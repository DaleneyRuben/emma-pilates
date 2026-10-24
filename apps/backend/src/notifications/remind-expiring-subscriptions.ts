import type { NewNotification } from './prisma-notification-store';

// The renewal reminder goes out 3 days before the paid-through date.
const reminderLeadDays = 3;
const dayMilliseconds = 24 * 60 * 60 * 1_000;

type RemindExpiringSubscriptionsDependencies = {
  today: Date;
  findSubscriptionsEndingOn(
    endsOn: Date,
  ): Promise<{ id: string; accountId: string }[]>;
  record(notification: NewNotification): Promise<void>;
};

export const remindExpiringSubscriptions = async (
  dependencies: RemindExpiringSubscriptionsDependencies,
): Promise<{ reminded: number }> => {
  const endsOn = new Date(
    dependencies.today.getTime() + reminderLeadDays * dayMilliseconds,
  );
  const subscriptions = await dependencies.findSubscriptionsEndingOn(endsOn);

  for (const subscription of subscriptions) {
    await dependencies.record({
      accountId: subscription.accountId,
      category: 'reminder',
      type: 'subscription_expiring',
      businessEventKey: `subscription-expiring:${subscription.id}`,
      title: 'Plan por vencer',
      message:
        'Tu plan vence en 3 días. Renueva cuando quieras y elige tu fecha de inicio.',
      destination: { type: 'subscription', id: subscription.id },
      occurredAt: dependencies.today,
    });
  }

  return { reminded: subscriptions.length };
};
