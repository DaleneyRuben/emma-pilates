import type { NewNotification } from './prisma-notification-store';

// The renewal reminder goes out once while 3 days or fewer remain.
const reminderLeadDays = 3;
const dayMilliseconds = 24 * 60 * 60 * 1_000;

export const subscriptionEndsWithinReminderWindow = (
  endsOn: Date,
  today: Date,
): boolean => {
  const latest = new Date(today.getTime() + reminderLeadDays * dayMilliseconds);

  return endsOn >= today && endsOn <= latest;
};

type RemindExpiringSubscriptionsDependencies = {
  today: Date;
  findSubscriptionsEndingWithin(
    today: Date,
  ): Promise<{ id: string; accountId: string }[]>;
  record(notification: NewNotification): Promise<void>;
};

export const remindExpiringSubscriptions = async (
  dependencies: RemindExpiringSubscriptionsDependencies,
): Promise<{ reminded: number }> => {
  const subscriptions = await dependencies.findSubscriptionsEndingWithin(
    dependencies.today,
  );

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
