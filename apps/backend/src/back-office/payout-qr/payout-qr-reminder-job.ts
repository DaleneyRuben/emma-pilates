import type { PrismaClient } from '../../generated/prisma/client';
import { dateTriggeredPushInstant } from '../../notifications/date-triggered-push';
import {
  recordNotification as defaultNotificationRecorder,
  settleReviewNotices,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import { addCivilDays, boliviaDate } from '../../time/bolivia-time';
import { remindPayoutQrs } from './remind-payout-qrs';

// An expired QR is reminded within a week of expiring; an older one (a QR
// that expired before the sweep existed) is left alone.
const expiredLookbackDays = 7;
const expiringLeadDays = 7;

// FIX-072: the payout QR reminders, after 09:00 La Paz like every
// date-triggered push, to the current QR of a staff member who can sign in.
export const createPayoutQrReminderJob = (
  prisma: PrismaClient,
  now: () => Date = () => new Date(),
  recordNotification: NotificationRecorder = defaultNotificationRecorder,
) => ({
  execute: () => {
    const instant = now();
    const occurredAt = dateTriggeredPushInstant(instant);
    if (occurredAt === null) return Promise.resolve({ reminded: 0 });
    const today = boliviaDate(instant);
    return remindPayoutQrs({
      today,
      occurredAt,
      findCurrentQrs: async () => {
        const qrs = await prisma.staffPayoutQr.findMany({
          where: {
            replacedAt: null,
            validUntil: {
              gte: addCivilDays(today, -expiredLookbackDays - 1),
              lte: addCivilDays(today, expiringLeadDays),
            },
            staffMember: {
              deletedAt: null,
              account: { is: { disabledAt: null, deletedAt: null } },
            },
          },
          select: {
            id: true,
            validUntil: true,
            staffMember: { select: { account: { select: { id: true } } } },
          },
        });
        return qrs.flatMap((qr) =>
          qr.staffMember.account === null
            ? []
            : [
                {
                  id: qr.id,
                  accountId: qr.staffMember.account.id,
                  validUntil: qr.validUntil,
                },
              ],
        );
      },
      findAlreadySent: async (keys) =>
        (
          await prisma.notification.findMany({
            where: { deletedAt: null, businessEventKey: { in: keys } },
            select: { businessEventKey: true },
          })
        ).map((notification) => notification.businessEventKey),
      // The push is queued in the same transaction as the inbox entry, and
      // the notices it supersedes are settled there too.
      record: (notification, settles) =>
        prisma.$transaction(async (transaction) => {
          await recordNotification(transaction, notification);
          for (const businessEventKey of settles) {
            await settleReviewNotices(transaction, {
              businessEventKey,
              settledAt: notification.occurredAt,
            });
          }
        }),
    });
  },
});
