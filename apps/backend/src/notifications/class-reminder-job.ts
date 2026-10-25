import { BookingState, type PrismaClient } from '../generated/prisma/client';
import { retrySerializable } from '../database/retry-serializable';
import type { NotificationRecorder } from './prisma-notification-store';
import {
  classReminderNotice,
  dueClassReminder,
  type ClassReminderKind,
} from './class-reminders';

const dayMilliseconds = 24 * 60 * 60 * 1_000;

export const createClassReminderJob = (
  prisma: PrismaClient,
  now: () => Date,
  recordNotification: NotificationRecorder,
) => ({
  execute: async (): Promise<{ sent: number }> => {
    const instant = now();
    const candidates = await prisma.booking.findMany({
      where: {
        state: BookingState.BOOKED,
        session: {
          state: 'SCHEDULED',
          startsAt: {
            gt: instant,
            lte: new Date(instant.getTime() + dayMilliseconds),
          },
        },
      },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    let sent = 0;

    for (const { id } of candidates) {
      sent += await retrySerializable(() =>
        prisma.$transaction(
          async (transaction) => {
            await transaction.$queryRaw`
              SELECT id FROM booking.bookings
              WHERE id = ${id}::uuid FOR UPDATE`;
            const booking = await transaction.booking.findUniqueOrThrow({
              where: { id },
              select: {
                id: true,
                state: true,
                createdAt: true,
                client: { select: { account: { select: { id: true } } } },
                session: {
                  select: {
                    state: true,
                    startsAt: true,
                    classType: { select: { name: true } },
                  },
                },
              },
            });
            const accountId = booking.client.account?.id;
            if (
              booking.state !== BookingState.BOOKED ||
              booking.session.state !== 'SCHEDULED' ||
              accountId === undefined
            ) {
              return 0;
            }

            const kind = dueClassReminder(
              {
                bookingId: booking.id,
                accountId,
                classTypeName: booking.session.classType.name,
                startsAt: booking.session.startsAt,
                createdAt: booking.createdAt,
              },
              instant,
            );
            if (kind === null) return 0;

            const alreadySent = await transaction.notification.findFirst({
              where: {
                accountId,
                businessEventKey: classReminderKey(booking.id, kind),
                deletedAt: null,
              },
              select: { id: true },
            });
            if (alreadySent !== null) return 0;

            await recordNotification(
              transaction,
              classReminderNotice({
                bookingId: booking.id,
                accountId,
                classTypeName: booking.session.classType.name,
                startsAt: booking.session.startsAt,
                createdAt: booking.createdAt,
                kind,
                occurredAt: instant,
              }),
            );
            return 1;
          },
          { isolationLevel: 'Serializable' },
        ),
      );
    }

    return { sent };
  },
});

const classReminderKey = (bookingId: string, kind: ClassReminderKind): string =>
  `class-reminder-${kind}:${bookingId}`;
