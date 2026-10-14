import { boliviaDate } from '../time/bolivia-time';
import type { PrismaClient } from '../generated/prisma/client';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from './prisma-notification-store';
import { remindExpiringSubscriptions } from './remind-expiring-subscriptions';

export const createSubscriptionReminderJob = (
  prisma: PrismaClient,
  now: () => Date = () => new Date(),
  recordNotification: NotificationRecorder = defaultNotificationRecorder,
) => ({
  execute: () =>
    remindExpiringSubscriptions({
      today: boliviaDate(now()),
      findSubscriptionsEndingOn: (endsOn) =>
        prisma.subscription
          .findMany({
            where: { state: 'ACTIVE', endsOn },
            select: {
              id: true,
              client: { select: { account: { select: { id: true } } } },
            },
          })
          .then((subscriptions) =>
            subscriptions.flatMap((subscription) =>
              subscription.client.account === null
                ? []
                : [
                    {
                      id: subscription.id,
                      accountId: subscription.client.account.id,
                    },
                  ],
            ),
          ),
      // The push is queued in the same transaction as the inbox entry.
      record: (notification) =>
        prisma.$transaction((transaction) =>
          recordNotification(transaction, notification),
        ),
    }),
});
