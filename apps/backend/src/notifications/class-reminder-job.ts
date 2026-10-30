import type { PrismaClient } from '../generated/prisma/client';
import { retrySerializable } from '../database/retry-serializable';
import { sweepEach } from '../jobs/sweep-each';
import type { NotificationRecorder } from './prisma-notification-store';
import { classReminderNotice, type ClassReminderKind } from './class-reminders';

type DueReminder = {
  bookingId: string;
  accountId: string;
  classTypeName: string;
  startsAt: Date;
  createdAt: Date;
  kind: ClassReminderKind;
};

export const createClassReminderJob = (
  prisma: PrismaClient,
  now: () => Date,
  recordNotification: NotificationRecorder,
) => ({
  execute: async (): Promise<{ sent: number }> => {
    const instant = now();
    // The windows of dueClassReminder, in SQL: the hour reminder covers
    // [starts_at − 2 h, starts_at); the day one [starts_at − 24 h,
    // starts_at − 2 h), for a Booking made before it. Only reminders not yet
    // in the inbox come back, so a sweep with nothing due opens no
    // transaction.
    const due = await prisma.$queryRaw<DueReminder[]>`
      SELECT * FROM (
        SELECT booking.id AS "bookingId",
               account.id AS "accountId",
               class_type.name AS "classTypeName",
               session.starts_at AS "startsAt",
               booking.created_at AS "createdAt",
               CASE
                 WHEN session.starts_at - interval '2 hours' <= ${instant} THEN 'hour'
                 WHEN booking.created_at < session.starts_at - interval '24 hours' THEN 'day'
               END AS kind
        FROM booking.bookings AS booking
        JOIN booking.sessions AS session ON session.id = booking.session_id
        JOIN booking.class_types AS class_type ON class_type.id = session.class_type_id
        JOIN system.accounts AS account ON account.client_id = booking.client_id
        WHERE booking.state = 'booked'
          AND session.state = 'scheduled'
          AND session.starts_at > ${instant}
          AND session.starts_at - interval '24 hours' <= ${instant}
          AND account.deleted_at IS NULL
      ) AS reminder
      WHERE reminder.kind IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM system.notifications AS notification
          WHERE notification.account_id = reminder."accountId"
            AND notification.business_event_key =
              'class-reminder-' || reminder.kind || ':' || reminder."bookingId"
            AND notification.deleted_at IS NULL
        )
      ORDER BY reminder."bookingId"`;
    let sent = 0;

    await sweepEach(
      'class_reminders',
      due,
      (row) => row.bookingId,
      async (row) => {
        sent += await retrySerializable(() =>
          prisma.$transaction(
            async (transaction) => {
              // A Booking cancelled since the read hears nothing.
              const live = await transaction.$queryRaw<unknown[]>`
                SELECT booking.id FROM booking.bookings AS booking
                JOIN booking.sessions AS session ON session.id = booking.session_id
                WHERE booking.id = ${row.bookingId}::uuid
                  AND booking.state = 'booked'
                  AND session.state = 'scheduled'
                FOR UPDATE OF booking`;
              if (live.length === 0) return 0;
              const count = await transaction.notification.count({
                where: {
                  accountId: row.accountId,
                  businessEventKey: `class-reminder-${row.kind}:${row.bookingId}`,
                  deletedAt: null,
                },
              });
              if (count > 0) return 0;
              await recordNotification(
                transaction,
                classReminderNotice({ ...row, occurredAt: instant }),
              );
              return 1;
            },
            { isolationLevel: 'Serializable' },
          ),
        );
      },
    );

    return { sent };
  },
});
