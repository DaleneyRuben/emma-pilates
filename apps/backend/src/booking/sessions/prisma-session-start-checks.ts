import {
  BookingState,
  SessionCancellationCause,
  SessionState,
  WaitlistClosureReason,
  type PrismaClient,
} from '../../generated/prisma/client';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import { retrySerializable } from '../../database/retry-serializable';
import {
  isEmptySessionCheckDue,
  waitlistSessionCancelledNotice,
  zeroBookingsTrainerNotice,
} from './session-start-checks';

const emptyCheckLeadMilliseconds = 2 * 60 * 60 * 1_000;

export const createPrismaSessionStartChecks = (
  prisma: PrismaClient,
  dependencies: {
    now: () => Date;
    recordNotification?: NotificationRecorder;
  },
) => {
  const recordNotification =
    dependencies.recordNotification ?? defaultNotificationRecorder;

  // One-time empty check (ADR-0058, BOOK-001): each due Session is settled in
  // its own transaction, and the completion marker makes reruns no-ops even
  // when the Session later drops to zero Bookings.
  const checkEmptySession = (
    sessionId: string,
    now: Date,
  ): Promise<'skipped' | 'checked' | 'cancelled'> =>
    retrySerializable(() =>
      prisma.$transaction(
        async (transaction) => {
          // The Session row is locked before its Bookings and Entries. NO KEY
          // UPDATE leaves a concurrent Booking's foreign-key share lock free,
          // so a Booking landing now surfaces as a serialization retry
          // instead of a lock wait.
          await transaction.$queryRaw`
            SELECT id FROM booking.sessions WHERE id = ${sessionId}::uuid FOR NO KEY UPDATE`;
          const session = await transaction.session.findUniqueOrThrow({
            where: { id: sessionId },
            select: {
              id: true,
              state: true,
              startsAt: true,
              endsAt: true,
              emptyBookingCheckCompletedAt: true,
              classType: { select: { name: true } },
              trainer: { select: { account: { select: { id: true } } } },
              _count: {
                select: {
                  bookings: { where: { state: BookingState.BOOKED } },
                },
              },
              waitlistEntries: {
                where: { closedAt: null },
                select: {
                  client: { select: { account: { select: { id: true } } } },
                },
              },
            },
          });
          if (
            session.state !== SessionState.SCHEDULED ||
            session.emptyBookingCheckCompletedAt !== null ||
            !isEmptySessionCheckDue(session, now)
          ) {
            return 'skipped';
          }

          if (session._count.bookings > 0) {
            await transaction.session.update({
              where: { id: session.id },
              data: { emptyBookingCheckCompletedAt: now },
            });
            return 'checked';
          }

          await transaction.session.update({
            where: { id: session.id },
            data: {
              state: SessionState.CANCELLED,
              cancellationCause: SessionCancellationCause.ZERO_BOOKINGS,
              cancelledAt: now,
              emptyBookingCheckCompletedAt: now,
            },
          });
          await transaction.waitlistEntry.updateMany({
            where: { sessionId: session.id, closedAt: null },
            data: {
              closedAt: now,
              closureReason: WaitlistClosureReason.SESSION_CANCELLED,
            },
          });
          if (session.trainer.account !== null) {
            await recordNotification(
              transaction,
              zeroBookingsTrainerNotice({
                accountId: session.trainer.account.id,
                sessionId: session.id,
                classTypeName: session.classType.name,
                startsAt: session.startsAt,
                occurredAt: now,
              }),
            );
          }
          for (const entry of session.waitlistEntries) {
            if (entry.client.account === null) continue;
            await recordNotification(
              transaction,
              waitlistSessionCancelledNotice({
                accountId: entry.client.account.id,
                sessionId: session.id,
                classTypeName: session.classType.name,
                occurredAt: now,
              }),
            );
          }
          return 'cancelled';
        },
        { isolationLevel: 'Serializable' },
      ),
    );

  const checkEmptySessions = async (): Promise<{
    checked: number;
    cancelled: number;
  }> => {
    const now = dependencies.now();
    const candidates = await prisma.session.findMany({
      where: {
        state: SessionState.SCHEDULED,
        emptyBookingCheckCompletedAt: null,
        startsAt: {
          lte: new Date(now.getTime() + emptyCheckLeadMilliseconds),
        },
        endsAt: { gt: now },
      },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    let checked = 0;
    let cancelled = 0;

    for (const { id } of candidates) {
      const outcome = await checkEmptySession(id, now);
      if (outcome === 'skipped') continue;
      checked += 1;
      if (outcome === 'cancelled') cancelled += 1;
    }

    return { checked, cancelled };
  };

  // Entries still open when their Session starts close without a notice. One
  // conditional statement makes reruns and a concurrent Leave harmless.
  const closeStartedWaitlists = async (): Promise<{ closed: number }> => {
    const now = dependencies.now();
    const { count } = await prisma.waitlistEntry.updateMany({
      where: {
        closedAt: null,
        session: { state: SessionState.SCHEDULED, startsAt: { lte: now } },
      },
      data: {
        closedAt: now,
        closureReason: WaitlistClosureReason.SESSION_STARTED,
      },
    });

    return { closed: count };
  };

  return { checkEmptySessions, closeStartedWaitlists };
};
