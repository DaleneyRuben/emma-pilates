import {
  BookingCancellationCause,
  BookingState,
  SessionCancellationCause,
  SessionState,
  WaitlistClosureReason,
  type Prisma,
} from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import {
  addCivilDays,
  boliviaDate,
  boliviaInstant,
} from '../../time/bolivia-time';
import { restoreBookedClass } from '../commands/restore-class';
import {
  minimumNotMetClientNotice,
  minimumNotMetTrainerNotice,
  waitlistSessionCancelledNotice,
  type AlternativeSession,
} from './session-start-checks';

type CheckedSession = {
  id: string;
  branchId: string;
  startsAt: Date;
  classType: { name: string };
  trainer: { account: { id: string } | null };
  bookings: {
    id: string;
    clientId: string;
    subscriptionId: string;
    client: { account: { id: string } | null };
  }[];
  waitlistEntries: { client: { account: { id: string } | null } }[];
};

export const checkedSessionSelect = {
  id: true,
  branchId: true,
  state: true,
  startsAt: true,
  minimumBookingsCheckCompletedAt: true,
  classType: { select: { name: true } },
  trainer: { select: { account: { select: { id: true } } } },
  bookings: {
    where: { state: BookingState.BOOKED },
    select: {
      id: true,
      clientId: true,
      subscriptionId: true,
      client: { select: { account: { select: { id: true } } } },
    },
  },
  waitlistEntries: {
    where: { closedAt: null },
    select: { client: { select: { account: { select: { id: true } } } } },
  },
} as const satisfies Prisma.SessionSelect;

// Later Sessions that day at the same Branch that still have places, each
// with the Clients already booked on it, in start order.
const sameDaySessionsWithPlaces = async (
  transaction: Prisma.TransactionClient,
  session: CheckedSession,
  now: Date,
) => {
  const day = boliviaDate(session.startsAt);
  const candidates = await transaction.session.findMany({
    where: {
      id: { not: session.id },
      branchId: session.branchId,
      state: SessionState.SCHEDULED,
      startsAt: {
        gt: now,
        gte: boliviaInstant(day, 0),
        lt: boliviaInstant(addCivilDays(day, 1), 0),
      },
    },
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    select: {
      startsAt: true,
      capacity: true,
      classType: { select: { name: true } },
      bookings: {
        where: { state: BookingState.BOOKED },
        select: { clientId: true },
      },
    },
  });
  return candidates.filter(
    (candidate) => candidate.bookings.length < candidate.capacity,
  );
};

// ADR-0007: below the Minimum Bookings the Session is cancelled as the system
// with the cause minimum_not_met. Every live Booking is cancelled and its
// class returned, the Waitlist closes, and the booked Clients, the waitlisted
// Clients, and the Trainer are notified, all in the caller's transaction.
export const cancelBelowMinimum = async (
  transaction: Prisma.TransactionClient,
  session: CheckedSession,
  facts: {
    now: Date;
    minimumBookings: number;
    recordNotification: NotificationRecorder;
  },
): Promise<void> => {
  const { now, recordNotification } = facts;
  await transaction.session.update({
    where: { id: session.id },
    data: {
      state: SessionState.CANCELLED,
      cancellationCause: SessionCancellationCause.MINIMUM_NOT_MET,
      cancelledAt: now,
      minimumBookingsCheckCompletedAt: now,
    },
  });

  const others =
    session.bookings.length === 0
      ? []
      : await sameDaySessionsWithPlaces(transaction, session, now);
  for (const booking of session.bookings) {
    await transaction.booking.update({
      where: { id: booking.id },
      data: {
        state: BookingState.CANCELLED,
        cancelledAt: now,
        cancellationCause: BookingCancellationCause.SESSION_CANCELLED,
      },
    });
    await restoreBookedClass(transaction, {
      bookingId: booking.id,
      subscriptionId: booking.subscriptionId,
      clientId: booking.clientId,
      now,
    });
    if (booking.client.account === null) continue;
    const alternatives: AlternativeSession[] = others
      .filter((other) =>
        other.bookings.every(({ clientId }) => clientId !== booking.clientId),
      )
      .map((other) => ({
        classTypeName: other.classType.name,
        startsAt: other.startsAt,
      }));
    await recordNotification(
      transaction,
      minimumNotMetClientNotice({
        accountId: booking.client.account.id,
        sessionId: session.id,
        classTypeName: session.classType.name,
        startsAt: session.startsAt,
        occurredAt: now,
        alternatives,
      }),
    );
  }

  await transaction.waitlistEntry.updateMany({
    where: { sessionId: session.id, closedAt: null },
    data: {
      closedAt: now,
      closureReason: WaitlistClosureReason.SESSION_CANCELLED,
    },
  });
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

  if (session.trainer.account !== null) {
    await recordNotification(
      transaction,
      minimumNotMetTrainerNotice({
        accountId: session.trainer.account.id,
        sessionId: session.id,
        classTypeName: session.classType.name,
        startsAt: session.startsAt,
        minimumBookings: facts.minimumBookings,
        occurredAt: now,
      }),
    );
  }
};
