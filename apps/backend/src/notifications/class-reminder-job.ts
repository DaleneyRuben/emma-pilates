import type { PrismaClient } from '../generated/prisma/client';
import { retrySerializable } from '../database/retry-serializable';
import type { NotificationRecorder } from './prisma-notification-store';
import {
  classReminderNotice,
  dueClassReminder,
  type ClassReminderKind,
} from './class-reminders';

const dayMilliseconds = 24 * 60 * 60 * 1_000;

type DueReminder = {
  bookingId: string;
  accountId: string;
  classTypeName: string;
  startsAt: Date;
  createdAt: Date;
};

export const createClassReminderJob = (
  prisma: PrismaClient,
  now: () => Date,
  recordNotification: NotificationRecorder,
) => ({
  execute: async (): Promise<{ sent: number }> => {
    const instant = now();
    const due = await prisma.$queryRaw<DueReminder[]>`
      SELECT booking.id AS "bookingId",
             account.id AS "accountId",
             class_type.name AS "classTypeName",
             session.starts_at AS "startsAt",
             booking.created_at AS "createdAt"
      FROM booking.bookings AS booking
      JOIN booking.sessions AS session ON session.id = booking.session_id
      JOIN booking.class_types AS class_type ON class_type.id = session.class_type_id
      JOIN booking.clients AS client ON client.id = booking.client_id
      JOIN system.accounts AS account ON account.client_id = client.id
      WHERE booking.state = 'booked'
        AND session.state = 'scheduled'
        AND session.starts_at > ${instant}
        AND session.starts_at <= ${new Date(instant.getTime() + dayMilliseconds)}
        AND account.deleted_at IS NULL
      ORDER BY booking.id`;
    let sent = 0;

    for (const row of due) {
      try {
        sent += await retrySerializable(() =>
          prisma.$transaction(
            async (transaction) => {
              const kind = dueClassReminder(
                {
                  bookingId: row.bookingId,
                  accountId: row.accountId,
                  classTypeName: row.classTypeName,
                  startsAt: row.startsAt,
                  createdAt: row.createdAt,
                },
                instant,
              );
              if (kind === null) return 0;
              const alreadySent = await transaction.notification.findFirst({
                where: {
                  accountId: row.accountId,
                  businessEventKey: classReminderKey(row.bookingId, kind),
                  deletedAt: null,
                },
                select: { id: true },
              });
              if (alreadySent !== null) return 0;
              await recordNotification(
                transaction,
                classReminderNotice({
                  bookingId: row.bookingId,
                  accountId: row.accountId,
                  classTypeName: row.classTypeName,
                  startsAt: row.startsAt,
                  createdAt: row.createdAt,
                  kind,
                  occurredAt: instant,
                }),
              );
              return 1;
            },
            { isolationLevel: 'Serializable' },
          ),
        );
      } catch {
        // One Booking that cannot be reminded must not stop the sweep.
      }
    }

    return { sent };
  },
});

const classReminderKey = (bookingId: string, kind: ClassReminderKind): string =>
  `class-reminder-${kind}:${bookingId}`;
