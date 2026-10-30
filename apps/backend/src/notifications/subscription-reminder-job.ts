import { addCivilDays, boliviaDate } from '../time/bolivia-time';
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
      // Already reminded Subscriptions are excluded, so a day the job misses
      // is recovered the next day instead of waiting for an exact date. A
      // Guest Pass or Courtesy Access is not renewed, and a Client whose next
      // Plan is already queued has renewed: neither is reminded.
      findSubscriptionsEndingWithin: async (today) => {
        const subscriptions = await prisma.subscription.findMany({
          where: {
            state: 'ACTIVE',
            endsOn: { gte: today, lte: addCivilDays(today, 3) },
            NOT: { payment: { is: { method: 'COURTESY' } } },
          },
          select: {
            id: true,
            endsOn: true,
            client: {
              select: {
                account: { select: { id: true } },
                subscriptions: {
                  where: { state: 'ACTIVE', startsOn: { gt: today } },
                  select: { startsOn: true },
                },
              },
            },
          },
        });
        const candidates = subscriptions.flatMap((subscription) =>
          subscription.client.account === null ||
          subscription.client.subscriptions.some(
            (next) => next.startsOn.getTime() > subscription.endsOn.getTime(),
          )
            ? []
            : [
                {
                  id: subscription.id,
                  accountId: subscription.client.account.id,
                },
              ],
        );
        if (candidates.length === 0) return [];

        const alreadySent = await prisma.notification.findMany({
          where: {
            type: 'subscription_expiring',
            deletedAt: null,
            businessEventKey: {
              in: candidates.map(
                (candidate) => `subscription-expiring:${candidate.id}`,
              ),
            },
          },
          select: { businessEventKey: true },
        });
        const sent = new Set(
          alreadySent.map((notification) => notification.businessEventKey),
        );

        return candidates.filter(
          (candidate) => !sent.has(`subscription-expiring:${candidate.id}`),
        );
      },
      // The push is queued in the same transaction as the inbox entry.
      record: (notification) =>
        prisma.$transaction((transaction) =>
          recordNotification(transaction, notification),
        ),
    }),
});
