import { boliviaDate } from '../time/bolivia-time';

export type FactBooking = {
  clientId: string;
  state: 'booked' | 'cancelled';
  outcome: 'attended' | 'no_show' | null;
};

export type FactSession = {
  id: string;
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  startsAt: Date;
  capacity: number;
  state: 'scheduled' | 'cancelled';
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
  classesBooked: number;
  classesAttended: number;
  renewed: boolean;
};

export type RecomputedFacts = {
  sessions: SessionFact[];
  clientMonths: ClientMonthFact[];
};

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

export const recomputeFacts = (
  source: FactSource,
  month: Date,
): RecomputedFacts => {
  const excluded = new Set(
    source.clients
      .filter((client) => !includeInAnalytics(client.excludedFromAnalytics))
      .map((client) => client.id),
  );
  const monthSessions = source.sessions.filter((session) =>
    inMonth(session.startsAt, month),
  );
  const counted = (session: FactSession) =>
    session.bookings.filter(
      (booking) =>
        booking.state === 'booked' && !excluded.has(booking.clientId),
    );

  return {
    sessions: monthSessions.map((session) => {
      const bookings = counted(session);
      return {
        sessionId: session.id,
        sessionDate: boliviaDate(session.startsAt),
        branchId: session.branchId,
        classTypeId: session.classTypeId,
        trainerStaffMemberId: session.trainerStaffMemberId,
        capacity: session.capacity,
        bookingsAtWindowClose: bookings.length,
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
        return {
          clientId: client.id,
          month,
          planDays: client.planDays,
          classesBooked: bookings.length,
          classesAttended: bookings.filter(
            (booking) => booking.outcome === 'attended',
          ).length,
          renewed: client.renewed,
        };
      }),
  };
};
