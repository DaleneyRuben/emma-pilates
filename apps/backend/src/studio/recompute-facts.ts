import { boliviaDate } from '../time/bolivia-time';

export type FactBooking = {
  clientId: string;
  state: 'booked' | 'cancelled';
  outcome: 'attended' | 'no_show' | null;
  // Cancelled because its Session was cancelled, not by the Client.
  cancelledWithSession?: boolean;
};

export type FactSession = {
  id: string;
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  state: 'scheduled' | 'cancelled';
  cancellationCause?: string | null;
  // Live Bookings when the Cancellation Window closed (BKM-009), null until
  // the worker snapshots it.
  bookingsAtWindowClose: number | null;
  bookings: FactBooking[];
};

export type FactClient = {
  id: string;
  planDays: number;
  renewed: boolean;
  excludedFromAnalytics: boolean;
};

export type FactSource = {
  sessions: FactSession[];
  clients: FactClient[];
};

export type SessionFact = {
  sessionId: string;
  sessionDate: Date;
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  capacity: number;
  bookingsAtWindowClose: number;
  attended: number;
  noShows: number;
};

export type ClientMonthFact = {
  clientId: string;
  month: Date;
  planDays: number;
  // Live Bookings plus those the studio released by cancelling the class
  // (finding 108); the inactive-client rule is its only reader.
  classesBooked: number;
  classesAttended: number;
  renewed: boolean;
};

export type CancelledSessionFact = {
  sessionId: string;
  sessionDate: Date;
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  cause: 'minimum_not_met' | 'zero_bookings';
  bookingsHeld: number;
};

export type RecomputedFacts = {
  sessions: SessionFact[];
  clientMonths: ClientMonthFact[];
  cancelledSessions: CancelledSessionFact[];
};

const lowDemandCause = (
  cause: string | null | undefined,
): CancelledSessionFact['cause'] | null =>
  cause === 'minimum_not_met' || cause === 'zero_bookings' ? cause : null;

// REL-016's store-review flag is not on this branch. Callers pass the flag
// they have; until that column exists they pass false and nothing is excluded.
export const includeInAnalytics = (excludedFromAnalytics: boolean): boolean =>
  !excludedFromAnalytics;

const monthEnds = (month: Date): Date =>
  new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));

const inMonth = (instant: Date, month: Date): boolean => {
  const date = boliviaDate(instant);
  return date >= month && date < monthEnds(month);
};

// A Session is taught once it ended and was not cancelled. Only those become
// session facts, so KPIs, recommendations, and the narrative never count a
// cancelled or future class. A Client's month still counts her live Bookings
// in Sessions not cancelled, future ones included: she did book them.
const taught = (session: FactSession, now: Date): boolean =>
  session.state === 'scheduled' && session.endsAt <= now;

export const recomputeFacts = (
  source: FactSource,
  month: Date,
  now: Date,
): RecomputedFacts => {
  const excluded = new Set(
    source.clients
      .filter((client) => !includeInAnalytics(client.excludedFromAnalytics))
      .map((client) => client.id),
  );
  const monthSessions = source.sessions.filter(
    (session) =>
      session.state === 'scheduled' && inMonth(session.startsAt, month),
  );
  const counted = (session: FactSession) =>
    session.bookings.filter(
      (booking) =>
        booking.state === 'booked' && !excluded.has(booking.clientId),
    );

  // Finding 107: a class the worker cancelled for low demand is kept apart,
  // with the Bookings it held, so it counts toward a weak schedule.
  const cancelledSessions = source.sessions.flatMap((session) => {
    const cause = lowDemandCause(session.cancellationCause);
    if (
      session.state !== 'cancelled' ||
      cause === null ||
      !inMonth(session.startsAt, month)
    ) {
      return [];
    }
    const held = session.bookings.filter(
      (booking) =>
        booking.cancelledWithSession === true &&
        !excluded.has(booking.clientId),
    ).length;
    return [
      {
        sessionId: session.id,
        sessionDate: boliviaDate(session.startsAt),
        branchId: session.branchId,
        classTypeId: session.classTypeId,
        trainerStaffMemberId: session.trainerStaffMemberId,
        cause,
        bookingsHeld: session.bookingsAtWindowClose ?? held,
      },
    ];
  });

  return {
    cancelledSessions,
    sessions: monthSessions
      .filter((session) => taught(session, now))
      .map((session) => {
        const bookings = counted(session);
        return {
          sessionId: session.id,
          sessionDate: boliviaDate(session.startsAt),
          branchId: session.branchId,
          classTypeId: session.classTypeId,
          trainerStaffMemberId: session.trainerStaffMemberId,
          capacity: session.capacity,
          // The snapshot is what Trainer pay counts; the live count stands in
          // only when the worker never took it.
          bookingsAtWindowClose:
            session.bookingsAtWindowClose ?? bookings.length,
          attended: bookings.filter((booking) => booking.outcome === 'attended')
            .length,
          noShows: bookings.filter((booking) => booking.outcome === 'no_show')
            .length,
        };
      }),
    clientMonths: source.clients
      .filter((client) => includeInAnalytics(client.excludedFromAnalytics))
      .map((client) => {
        const bookings = monthSessions.flatMap((session) =>
          session.bookings.filter(
            (booking) =>
              booking.clientId === client.id && booking.state === 'booked',
          ),
        );
        // Finding 108: a Booking the studio released by cancelling its class
        // (minimum not met, a studio cancellation, a paused series) still
        // shows she wanted to come, so she is not an inactive Client.
        const releasedByStudio = source.sessions
          .filter((session) => inMonth(session.startsAt, month))
          .flatMap((session) =>
            session.bookings.filter(
              (booking) =>
                booking.clientId === client.id &&
                booking.cancelledWithSession === true,
            ),
          );
        return {
          clientId: client.id,
          month,
          planDays: client.planDays,
          classesBooked: bookings.length + releasedByStudio.length,
          classesAttended: bookings.filter(
            (booking) => booking.outcome === 'attended',
          ).length,
          renewed: client.renewed,
        };
      }),
  };
};
