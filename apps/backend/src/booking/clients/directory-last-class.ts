import type { PrismaClient } from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';

// FIX-091 (W8 A): Clientas' «Última clase», the Bolivia day of the latest
// class each Client kept her place in that had started by `now`. A
// cancelled or moved Booking, a cancelled class, and a recorded no-show do
// not count; a class nobody took attendance for does.
export const readLastClassDates = async (
  prisma: PrismaClient,
  clientIds: readonly string[],
  now: Date,
): Promise<Map<string, Date>> => {
  if (clientIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<
    { client_id: string; last_starts_at: Date }[]
  >`
    SELECT b.client_id, max(s.starts_at) AS last_starts_at
    FROM booking.bookings b
    JOIN booking.sessions s ON s.id = b.session_id
    LEFT JOIN booking.attendance_records a ON a.booking_id = b.id
    WHERE b.client_id = ANY(${[...clientIds]}::uuid[])
      AND b.state = 'booked'
      AND s.state = 'scheduled'
      AND s.starts_at <= ${now}
      AND (a.outcome IS NULL OR a.outcome <> 'no_show')
    GROUP BY b.client_id`;
  return new Map(
    rows.map((row) => [row.client_id, boliviaDate(row.last_starts_at)]),
  );
};
