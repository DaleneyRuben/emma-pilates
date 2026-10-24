import type { PrismaClient } from '../generated/prisma/client';
import { monthKpis, type MonthKpiCounts } from './month-kpis';

type SessionRow = {
  capacity: number;
  bookings_at_window_close: number;
  attended: number;
  no_shows: number;
};

type ClientRow = {
  client_id: string;
  plan_days: number;
  renewed: boolean;
};

const monthStart = (month: Date) =>
  new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));

// Studio Management reads its own fact tables. Booking stays behind the
// recompute that wrote them (ADR-0103).
export const readMonthKpis = async (
  prisma: PrismaClient,
  input: { month: Date },
): Promise<MonthKpiCounts> => {
  const month = monthStart(input.month);
  const sessions = await prisma.$queryRaw<SessionRow[]>`
    SELECT capacity, bookings_at_window_close, attended, no_shows
    FROM studio.session_facts
    WHERE deleted_at IS NULL
      AND session_date >= ${month}::date
      AND session_date < (${month}::date + INTERVAL '1 month')
  `;
  const clientMonths = await prisma.$queryRaw<ClientRow[]>`
    SELECT client_id, plan_days, renewed
    FROM studio.client_month_facts
    WHERE deleted_at IS NULL
      AND month = ${month}::date
  `;
  const earlier = await prisma.$queryRaw<{ client_id: string }[]>`
    SELECT DISTINCT client_id
    FROM studio.client_month_facts
    WHERE deleted_at IS NULL
      AND plan_days > 0
      AND month < ${month}::date
  `;
  return monthKpis({
    sessions: sessions.map((row) => ({
      capacity: Number(row.capacity),
      bookingsAtWindowClose: Number(row.bookings_at_window_close),
      attended: Number(row.attended),
      noShows: Number(row.no_shows),
    })),
    clientMonths: clientMonths.map((row) => ({
      clientId: row.client_id,
      month: month.toISOString().slice(0, 7),
      planDays: Number(row.plan_days),
      renewed: row.renewed,
    })),
    earlierActiveClientIds: earlier.map((row) => row.client_id),
  });
};
