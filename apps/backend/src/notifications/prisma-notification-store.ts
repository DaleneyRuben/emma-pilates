import type { Prisma, PrismaClient } from '../generated/prisma/client';
import { NotificationCategory as PrismaNotificationCategory } from '../generated/prisma/enums';
import type {
  NotificationCategory,
  NotificationRecord,
} from './list-notifications';
import type { NotificationCursor } from './notification-cursor';

export type NewNotification = {
  accountId: string;
  category: NotificationCategory;
  type: string;
  businessEventKey: string;
  title: string;
  message: string;
  destination: { type: string; id: string | null } | null;
  occurredAt: Date;
};

export type NotificationRecorder = (
  transaction: Prisma.TransactionClient,
  notification: NewNotification,
) => Promise<void>;

export const createNotificationRecorder =
  (boss: unknown): NotificationRecorder =>
  () =>
    Promise.reject(new Error(`not implemented ${typeof boss}`));

const categories: Record<NotificationCategory, PrismaNotificationCategory> = {
  booking_schedule: PrismaNotificationCategory.BOOKING_SCHEDULE,
  reminder: PrismaNotificationCategory.REMINDER,
  subscription_payment: PrismaNotificationCategory.SUBSCRIPTION_PAYMENT,
  announcement: PrismaNotificationCategory.ANNOUNCEMENT,
};

const categoryNames = Object.fromEntries(
  Object.entries(categories).map(([name, value]) => [value, name]),
) as Record<PrismaNotificationCategory, NotificationCategory>;

const notificationSelect = {
  id: true,
  category: true,
  type: true,
  title: true,
  message: true,
  destinationType: true,
  destinationId: true,
  createdAt: true,
  readAt: true,
} as const;

// Notifications are addressed to an Account and deduplicated per business event,
// so an at-least-once producer can record the same event twice safely.
export const recordNotification: NotificationRecorder = async (
  transaction,
  notification,
) => {
  await transaction.notification.createMany({
    data: {
      accountId: notification.accountId,
      category: categories[notification.category],
      type: notification.type,
      businessEventKey: notification.businessEventKey,
      title: notification.title,
      message: notification.message,
      destinationType: notification.destination?.type ?? null,
      destinationId: notification.destination?.id ?? null,
      createdAt: notification.occurredAt,
    },
    skipDuplicates: true,
  });
};

export const createNotificationStore = (prisma: PrismaClient) => ({
  record: recordNotification,
  findPage: (input: {
    accountId: string;
    after: NotificationCursor | null;
    limit: number;
  }): Promise<NotificationRecord[]> =>
    prisma.notification
      .findMany({
        where: {
          accountId: input.accountId,
          deletedAt: null,
          ...(input.after === null
            ? {}
            : {
                OR: [
                  { createdAt: { lt: input.after.createdAt } },
                  {
                    createdAt: input.after.createdAt,
                    id: { lt: input.after.id },
                  },
                ],
              }),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: input.limit,
        select: notificationSelect,
      })
      .then((rows) =>
        rows.map((row) => ({ ...row, category: categoryNames[row.category] })),
      ),
  countUnread: (accountId: string): Promise<number> =>
    prisma.notification.count({
      where: { accountId, readAt: null, deletedAt: null },
    }),
  markRead: (input: {
    notificationId: string;
    accountId: string;
    readAt: Date;
  }): Promise<number> =>
    prisma.notification
      .updateMany({
        where: {
          id: input.notificationId,
          accountId: input.accountId,
          readAt: null,
        },
        data: { readAt: input.readAt },
      })
      .then((result) => result.count),
  markAllRead: (input: { accountId: string; readAt: Date }): Promise<number> =>
    prisma.notification
      .updateMany({
        where: { accountId: input.accountId, readAt: null },
        data: { readAt: input.readAt },
      })
      .then((result) => result.count),
});

export type NotificationStore = ReturnType<typeof createNotificationStore>;
