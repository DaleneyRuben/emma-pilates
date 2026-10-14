import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AccountDeviceDeactivationReason,
  NotificationDeliveryState,
} from '../../generated/prisma/enums';
import type { DispatchPushDependencies } from './dispatch-push';

type PushDeliveries = Omit<DispatchPushDependencies, 'send' | 'now'>;

// A device is reachable while it is active and an Authentication Session that
// uses it is still live, so an expired sign-in stops receiving pushes.
const reachableDevice = (at: Date): Prisma.AccountDeviceWhereInput => ({
  deactivatedAt: null,
  sessions: {
    some: {
      revokedAt: null,
      deletedAt: null,
      idleExpiresAt: { gt: at },
      absoluteExpiresAt: { gt: at },
    },
  },
});

export const deactivateUnregisteredDevices = async (
  transaction: Prisma.TransactionClient,
  deviceIds: string[],
  at: Date,
): Promise<void> => {
  if (deviceIds.length === 0) return;
  await transaction.accountDevice.updateMany({
    where: { id: { in: deviceIds }, deactivatedAt: null },
    data: {
      deactivatedAt: at,
      deactivationReason: AccountDeviceDeactivationReason.DEVICE_NOT_REGISTERED,
      // A deactivated device holds no push token (account_devices_active_state_check).
      expoPushToken: null,
    },
  });
};

export const createPrismaPushDeliveries = (
  prisma: PrismaClient,
  now: () => Date = () => new Date(),
): PushDeliveries => ({
  // A read or removed entry needs no prompt any more.
  findNotification: ({ accountId, businessEventKey }) =>
    prisma.notification.findFirst({
      where: { accountId, businessEventKey, readAt: null, deletedAt: null },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        destinationType: true,
        destinationId: true,
      },
    }),

  prepareDeliveries: async ({ notificationId, accountId }) => {
    const at = now();
    const devices = await prisma.accountDevice.findMany({
      where: { accountId, ...reachableDevice(at) },
      select: { id: true },
    });
    await prisma.notificationDelivery.createMany({
      data: devices.map(({ id }) => ({
        notificationId,
        accountDeviceId: id,
        createdAt: at,
      })),
      skipDuplicates: true,
    });
    await prisma.notificationDelivery.updateMany({
      where: {
        notificationId,
        state: NotificationDeliveryState.QUEUED,
        accountDevice: { deactivatedAt: { not: null } },
      },
      data: {
        state: NotificationDeliveryState.DISCARDED,
        failureCategory: 'device_inactive',
        completedAt: at,
      },
    });

    const queued = await prisma.notificationDelivery.findMany({
      where: {
        notificationId,
        state: NotificationDeliveryState.QUEUED,
        accountDevice: reachableDevice(at),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        accountDevice: { select: { id: true, expoPushToken: true } },
      },
    });

    return queued.flatMap(({ id, accountDevice }) =>
      accountDevice.expoPushToken === null
        ? []
        : [
            {
              deliveryId: id,
              deviceId: accountDevice.id,
              expoPushToken: accountDevice.expoPushToken,
            },
          ],
    );
  },

  countUnread: (accountId) =>
    prisma.notification.count({
      where: { accountId, readAt: null, deletedAt: null },
    }),

  recordTickets: (tickets, at) =>
    prisma.$transaction(async (transaction) => {
      for (const { deliveryId, ticket } of tickets) {
        await transaction.notificationDelivery.update({
          where: { id: deliveryId },
          data:
            ticket.status === 'ok'
              ? {
                  state: NotificationDeliveryState.SUBMITTED,
                  providerTicketId: ticket.id,
                  attemptCount: { increment: 1 },
                  lastAttemptAt: at,
                }
              : {
                  state: NotificationDeliveryState.FAILED,
                  failureCategory: ticket.category,
                  attemptCount: { increment: 1 },
                  lastAttemptAt: at,
                  completedAt: at,
                },
        });
      }
      await deactivateUnregisteredDevices(
        transaction,
        tickets.flatMap(({ deviceId, ticket }) =>
          ticket.status === 'error' && ticket.deviceNotRegistered
            ? [deviceId]
            : [],
        ),
        at,
      );
    }),

  recordAttempt: async (deliveryIds, failure, at) => {
    await prisma.notificationDelivery.updateMany({
      where: {
        id: { in: deliveryIds },
        state: NotificationDeliveryState.QUEUED,
      },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: at,
        failureCategory: failure.category,
        ...(failure.final
          ? { state: NotificationDeliveryState.FAILED, completedAt: at }
          : {}),
      },
    });
  },
});
