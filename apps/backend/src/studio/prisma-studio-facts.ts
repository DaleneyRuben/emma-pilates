import type { Prisma, PrismaClient } from '../generated/prisma/client';
import { readPlanRenewals } from '../booking/payments/plan-renewals';
import {
  recomputeFacts,
  type FactBooking,
  type FactClient,
  type FactSession,
  type FactSource,
} from './recompute-facts';

type SourceRow = {
  session_id: string;
  branch_id: string;
  class_type_id: string;
  trainer_staff_member_id: string;
  starts_at: Date;
  ends_at: Date;
  capacity: number;
  state: string;
  bookings_at_window_close: number | null;
  client_id: string | null;
  booking_state: string | null;
  outcome: string | null;
};

type ClientRow = {
  client_id: string;
  plan_days: number;
};

const monthEnd = (month: Date): Date =>
  new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));

// Booking exposes no studio query yet, so Studio Management reads the booking
// schema by name (ADR-0011) and never imports Booking's internals. Plan days
// come only from a Plan she bought and that stands: a guest pass and Courtesy
// Access are courtesy Payments, and a voided sale is no sale (booking
// ADR-0009, ADR-0012). A Subscription from before Payments has none and counts.
const readSource = async (
  prisma: PrismaClient,
  month: Date,
): Promise<FactSource> => {
  const until = monthEnd(month);
  const rows = await prisma.$queryRaw<SourceRow[]>`
    SELECT s.id AS session_id, s.branch_id, s.class_type_id, s.trainer_staff_member_id,
           s.starts_at, s.ends_at, s.capacity, s.state::text AS state,
           s.bookings_at_window_close,
           b.client_id, b.state::text AS booking_state, a.outcome::text AS outcome
    FROM booking.sessions s
    LEFT JOIN booking.bookings b ON b.session_id = s.id
    LEFT JOIN booking.attendance_records a ON a.booking_id = b.id
    WHERE (s.starts_at AT TIME ZONE 'America/La_Paz')::date >= ${month}::date
      AND (s.starts_at AT TIME ZONE 'America/La_Paz')::date < ${until}::date
  `;
  const clients = await prisma.$queryRaw<ClientRow[]>`
    SELECT c.id AS client_id,
           COALESCE((
             SELECT GREATEST(
               0,
               LEAST(s.ends_on, (${until}::date - 1))
                 - GREATEST(s.starts_on, ${month}::date)
                 + 1
             )
             FROM booking.subscriptions s
             LEFT JOIN booking.payments p ON p.id = s.payment_id
             WHERE s.client_id = c.id
               AND s.starts_on < ${until}::date
               AND s.ends_on >= ${month}::date
               AND NOT s.ended_by_void
               AND (s.payment_id IS NULL
                 OR (p.state = 'confirmed' AND p.method <> 'courtesy'))
             ORDER BY s.starts_on DESC
             LIMIT 1
           ), 0)::int AS plan_days
    FROM booking.clients c
    WHERE c.deleted_at IS NULL
  `;
  // Owner decision 5: the KPIs read the same «renovó» as the bonus.
  const renewedClients = new Set(
    (await readPlanRenewals(prisma, month, until))
      .filter((plan) => plan.renewed)
      .map((plan) => plan.clientId),
  );
  const sessions = new Map<string, FactSession>();
  for (const row of rows) {
    const session = sessions.get(row.session_id) ?? {
      id: row.session_id,
      branchId: row.branch_id,
      classTypeId: row.class_type_id,
      trainerStaffMemberId: row.trainer_staff_member_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      capacity: row.capacity,
      state: row.state === 'cancelled' ? 'cancelled' : 'scheduled',
      bookingsAtWindowClose:
        row.bookings_at_window_close === null
          ? null
          : Number(row.bookings_at_window_close),
      bookings: [],
    };
    if (row.client_id !== null && row.booking_state !== null) {
      const booking: FactBooking = {
        clientId: row.client_id,
        state: row.booking_state === 'booked' ? 'booked' : 'cancelled',
        outcome:
          row.outcome === 'attended' || row.outcome === 'no_show'
            ? row.outcome
            : null,
      };
      session.bookings.push(booking);
    }
    sessions.set(row.session_id, session);
  }
  return {
    sessions: [...sessions.values()],
    clients: clients.map((row): FactClient => ({
      id: row.client_id,
      planDays: Number(row.plan_days),
      renewed: renewedClients.has(row.client_id),
      // REL-016 has not added the store-review flag. The seam takes it;
      // until the column exists every live Client is included.
      excludedFromAnalytics: false,
    })),
  };
};

const sameSession = (
  existing: {
    sessionDate: Date;
    branchId: string;
    classTypeId: string;
    trainerStaffMemberId: string;
    capacity: number;
    bookingsAtWindowClose: number;
    attended: number;
    noShows: number;
  },
  next: {
    sessionDate: Date;
    branchId: string;
    classTypeId: string;
    trainerStaffMemberId: string;
    capacity: number;
    bookingsAtWindowClose: number;
    attended: number;
    noShows: number;
  },
): boolean =>
  existing.sessionDate.getTime() === next.sessionDate.getTime() &&
  existing.branchId === next.branchId &&
  existing.classTypeId === next.classTypeId &&
  existing.trainerStaffMemberId === next.trainerStaffMemberId &&
  existing.capacity === next.capacity &&
  existing.bookingsAtWindowClose === next.bookingsAtWindowClose &&
  existing.attended === next.attended &&
  existing.noShows === next.noShows;

export const recomputeStudioFacts = async (
  prisma: PrismaClient,
  input: { month: Date; now: () => Date },
): Promise<{ sessions: number; clientMonths: number }> => {
  const month = new Date(
    Date.UTC(input.month.getUTCFullYear(), input.month.getUTCMonth(), 1),
  );
  const source = await readSource(prisma, month);
  const now = input.now();
  const facts = recomputeFacts(source, month, now);
  await prisma.$transaction(async (transaction) => {
    await writeSessionFacts(transaction, facts.sessions, month, now);
    await writeClientMonthFacts(transaction, facts.clientMonths, month, now);
  });
  return {
    sessions: facts.sessions.length,
    clientMonths: facts.clientMonths.length,
  };
};

const writeSessionFacts = async (
  transaction: Prisma.TransactionClient,
  sessions: ReturnType<typeof recomputeFacts>['sessions'],
  month: Date,
  now: Date,
): Promise<void> => {
  // Every live fact of the month that is no longer a taught Session goes,
  // also one written before a cancellation or before FIX-008.
  const live = await transaction.sessionFact.findMany({
    where: {
      deletedAt: null,
      sessionDate: { gte: month, lt: monthEnd(month) },
    },
  });
  const wanted = new Set(sessions.map((session) => session.sessionId));
  for (const existing of live) {
    if (!wanted.has(existing.sessionId)) {
      await transaction.sessionFact.update({
        where: { sessionId: existing.sessionId },
        data: { deletedAt: now },
      });
    }
  }
  for (const session of sessions) {
    const existing = live.find((row) => row.sessionId === session.sessionId);
    if (existing?.deletedAt === null && sameSession(existing, session)) {
      continue;
    }
    await transaction.sessionFact.upsert({
      where: { sessionId: session.sessionId },
      create: { ...session, updatedAt: now },
      update: { ...session, deletedAt: null, updatedAt: now },
    });
  }
};

const writeClientMonthFacts = async (
  transaction: Prisma.TransactionClient,
  clientMonths: ReturnType<typeof recomputeFacts>['clientMonths'],
  month: Date,
  now: Date,
): Promise<void> => {
  const live = await transaction.clientMonthFact.findMany({
    where: { month, deletedAt: null },
  });
  const wanted = new Set(clientMonths.map((row) => row.clientId));
  for (const existing of live) {
    if (wanted.has(existing.clientId)) continue;
    await transaction.clientMonthFact.update({
      where: { clientId_month: { clientId: existing.clientId, month } },
      data: { deletedAt: now },
    });
  }
  for (const row of clientMonths) {
    const existing = live.find((item) => item.clientId === row.clientId);
    if (
      existing &&
      existing.planDays === row.planDays &&
      existing.classesBooked === row.classesBooked &&
      existing.classesAttended === row.classesAttended &&
      existing.renewed === row.renewed
    ) {
      continue;
    }
    await transaction.clientMonthFact.upsert({
      where: { clientId_month: { clientId: row.clientId, month } },
      create: { ...row, updatedAt: now },
      update: { ...row, deletedAt: null, updatedAt: now },
    });
  }
};
