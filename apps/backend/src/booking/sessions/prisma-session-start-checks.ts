import {
  SessionState,
  WaitlistClosureReason,
  type PrismaClient,
} from '../../generated/prisma/client';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import { sweepEach } from '../../jobs/sweep-each';
import { retrySerializable } from '../../database/retry-serializable';
import { readCurrentStudioSettings } from '../studio-settings/prisma-studio-settings';
import {
  cancelBelowMinimum,
  checkedSessionSelect,
} from './prisma-minimum-bookings-cancellation';
import { isMinimumBookingsCheckDue } from './session-start-checks';

type MinimumRule = { minimumBookings: number; leadMinutes: number };

export const createPrismaSessionStartChecks = (
  prisma: PrismaClient,
  dependencies: {
    now: () => Date;
    recordNotification?: NotificationRecorder;
  },
) => {
  const recordNotification =
    dependencies.recordNotification ?? defaultNotificationRecorder;

  // One-time Minimum Bookings check (ADR-0007, BKM-009): each due Session is
  // settled in its own transaction, and the completion marker makes reruns
  // and a restart mid-sweep no-ops for the Sessions already settled.
  const settleSession = (
    sessionId: string,
    now: Date,
    rule: MinimumRule,
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
            select: checkedSessionSelect,
          });
          if (
            session.state !== SessionState.SCHEDULED ||
            session.minimumBookingsCheckCompletedAt !== null ||
            !isMinimumBookingsCheckDue(session, now, rule.leadMinutes)
          ) {
            return 'skipped';
          }

          if (session.bookings.length >= rule.minimumBookings) {
            await transaction.session.update({
              where: { id: session.id },
              data: { minimumBookingsCheckCompletedAt: now },
            });
            return 'checked';
          }

          await cancelBelowMinimum(transaction, session, {
            now,
            minimumBookings: rule.minimumBookings,
            recordNotification,
          });
          return 'cancelled';
        },
        { isolationLevel: 'Serializable' },
      ),
    );

  const checkMinimumBookings = async (): Promise<{
    checked: number;
    cancelled: number;
  }> => {
    const now = dependencies.now();
    // Read once per sweep: a minimum changed in Studio Settings applies from
    // the next sweep on.
    const settings = await readCurrentStudioSettings(prisma);
    const rule: MinimumRule = {
      minimumBookings: settings.minimumBookings,
      leadMinutes: settings.minimumBookingsCheckLeadMinutes,
    };
    const candidates = await prisma.session.findMany({
      where: {
        state: SessionState.SCHEDULED,
        minimumBookingsCheckCompletedAt: null,
        startsAt: {
          lte: new Date(now.getTime() + rule.leadMinutes * 60_000),
          gt: now,
        },
      },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    let checked = 0;
    let cancelled = 0;

    // One Session whose settlement fails must not stop the sweep; it is
    // reported once the others are settled.
    await sweepEach(
      'minimum_bookings_check',
      candidates,
      ({ id }) => id,
      async ({ id }) => {
        const outcome = await settleSession(id, now, rule);
        if (outcome === 'skipped') return;
        checked += 1;
        if (outcome === 'cancelled') cancelled += 1;
      },
    );

    return { checked, cancelled };
  };

  // ADR-0007: when its Cancellation Window closes, a scheduled Session records
  // its live Bookings, which Trainer pay counts (BKO-006). One conditional
  // statement records each Session once, whatever reruns or restarts follow.
  const recordWindowCloseBookings = async (): Promise<{ recorded: number }> => {
    const now = dependencies.now();
    const { cancellationWindowMinutes } =
      await readCurrentStudioSettings(prisma);
    const closesBy = new Date(
      now.getTime() + cancellationWindowMinutes * 60_000,
    );
    const recorded = await prisma.$executeRaw`
      UPDATE booking.sessions AS session
      SET bookings_at_window_close = (
            SELECT count(*) FROM booking.bookings AS booking
            WHERE booking.session_id = session.id
              AND booking.created_at <= session.starts_at - (${cancellationWindowMinutes} * interval '1 minute')
              AND (
                booking.state = 'booked'
                OR (
                  booking.state = 'cancelled'
                  AND booking.cancelled_at > session.starts_at - (${cancellationWindowMinutes} * interval '1 minute')
                )
              )
          ),
          updated_at = ${now}
      WHERE session.state = 'scheduled'
        AND session.bookings_at_window_close IS NULL
        AND session.starts_at <= ${closesBy}`;

    return { recorded };
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

  return {
    checkMinimumBookings,
    recordWindowCloseBookings,
    closeStartedWaitlists,
  };
};
