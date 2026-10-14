import type { PrismaClient } from '../../generated/prisma/client';
import { NotificationDeliveryState } from '../../generated/prisma/enums';
import type { CheckPushReceiptsDependencies } from './check-push-receipts';
import { deactivateUnregisteredDevices } from './prisma-push-deliveries';

type PushReceipts = Omit<CheckPushReceiptsDependencies, 'getReceipts' | 'now'>;

export const createPrismaPushReceipts = (
  prisma: PrismaClient,
): PushReceipts => ({
  discardUnconfirmed: (submittedBefore, at) =>
    prisma.notificationDelivery
      .updateMany({
        where: {
          state: NotificationDeliveryState.SUBMITTED,
          lastAttemptAt: { lt: submittedBefore },
        },
        data: {
          state: NotificationDeliveryState.DISCARDED,
          failureCategory: 'receipt_unavailable',
          completedAt: at,
        },
      })
      .then((result) => result.count),

  // Least recently checked first, so receipts Expo has not produced yet do not
  // starve the rest of the batch.
  findSubmitted: async ({ submittedBefore, limit }) => {
    const rows = await prisma.notificationDelivery.findMany({
      where: {
        state: NotificationDeliveryState.SUBMITTED,
        lastAttemptAt: { lte: submittedBefore },
      },
      orderBy: [
        { receiptCheckedAt: { sort: 'asc', nulls: 'first' } },
        { lastAttemptAt: 'asc' },
      ],
      take: limit,
      select: { id: true, accountDeviceId: true, providerTicketId: true },
    });

    return rows.flatMap(({ id, accountDeviceId, providerTicketId }) =>
      providerTicketId === null
        ? []
        : [
            {
              deliveryId: id,
              deviceId: accountDeviceId,
              ticketId: providerTicketId,
            },
          ],
    );
  },

  recordReceipts: (deliveries, at) =>
    prisma.$transaction(async (transaction) => {
      for (const { deliveryId, outcome } of deliveries) {
        await transaction.notificationDelivery.updateMany({
          where: { id: deliveryId, state: NotificationDeliveryState.SUBMITTED },
          data:
            outcome === null
              ? { receiptCheckedAt: at }
              : outcome.status === 'ok'
                ? {
                    state: NotificationDeliveryState.DELIVERED,
                    receiptCheckedAt: at,
                    completedAt: at,
                  }
                : {
                    state: NotificationDeliveryState.FAILED,
                    failureCategory: outcome.category,
                    receiptCheckedAt: at,
                    completedAt: at,
                  },
        });
      }
      await deactivateUnregisteredDevices(
        transaction,
        deliveries.flatMap(({ deviceId, outcome }) =>
          outcome?.status === 'error' && outcome.deviceNotRegistered
            ? [deviceId]
            : [],
        ),
        at,
      );
    }),
});
