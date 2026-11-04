import {
  BookingState,
  SessionCancellationCause,
  SessionState,
} from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import { boliviaInstant } from '../../time/bolivia-time';
import type { AdministratorActor } from './administration-errors';

// Cancels a schedule's unbooked, non-exception Sessions on [from, until) that
// have not started; booked or waitlisted ones and exceptions stay (ADR-0059).
// Ending or replacing a series withdraws with SCHEDULE_CHANGED; pausing it
// with SCHEDULE_PAUSED, so resuming restores exactly those (BKM-018).
export const withdrawSessions = async (
  transaction: Prisma.TransactionClient,
  input: {
    sessionScheduleId: string;
    from: Date;
    until: Date | null;
    cause: SessionCancellationCause;
  },
  actor: AdministratorActor,
  now: Date,
): Promise<{ cancelledSessions: number; keptSessions: number }> => {
  const sessions = await transaction.session.findMany({
    where: {
      sessionScheduleId: input.sessionScheduleId,
      state: SessionState.SCHEDULED,
      startsAt: {
        gte: boliviaInstant(input.from, 0),
        gt: now,
        ...(input.until === null ? {} : { lt: boliviaInstant(input.until, 0) }),
      },
    },
    select: {
      id: true,
      isException: true,
      _count: {
        select: {
          bookings: { where: { state: BookingState.BOOKED } },
          waitlistEntries: { where: { closedAt: null } },
        },
      },
    },
  });
  const unbooked = sessions.filter(
    (session) =>
      !session.isException &&
      session._count.bookings === 0 &&
      session._count.waitlistEntries === 0,
  );
  if (unbooked.length > 0) {
    await transaction.session.updateMany({
      where: { id: { in: unbooked.map(({ id }) => id) } },
      data: {
        state: SessionState.CANCELLED,
        cancellationCause: input.cause,
        cancelledAt: now,
        cancelledByAccountId: actor.accountId,
      },
    });
  }
  return {
    cancelledSessions: unbooked.length,
    keptSessions: sessions.length - unbooked.length,
  };
};
