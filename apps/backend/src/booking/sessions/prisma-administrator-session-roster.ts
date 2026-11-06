import type { PrismaClient } from '../../generated/prisma/client';
import {
  clientNameAndPhoto,
  clientNameSelect,
} from '../client/client-photo-of';
import type { FindAdministratorSessionRoster } from './administrator-session-roster';

const outcomes = { ATTENDED: 'attended', NO_SHOW: 'no_show' } as const;

// Booked Clients in booking order and the open Waitlist in queue order: the
// position is the entry's place among the open ones (joinedAt, then id, as
// promotion reads them).
export const findAdministratorSessionRoster =
  (prisma: PrismaClient): FindAdministratorSessionRoster =>
  async (sessionId) => {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        bookings: {
          where: { state: 'BOOKED' },
          select: {
            id: true,
            clientId: true,
            client: clientNameSelect,
            attendanceRecord: { select: { outcome: true } },
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
        waitlistEntries: {
          where: { closedAt: null },
          select: {
            id: true,
            clientId: true,
            client: clientNameSelect,
          },
          orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (session === null) return null;

    return {
      sessionId: session.id,
      bookings: session.bookings.map((booking) => ({
        bookingId: booking.id,
        clientId: booking.clientId,
        ...clientNameAndPhoto(booking.client),
        attendanceOutcome:
          booking.attendanceRecord === null
            ? null
            : outcomes[booking.attendanceRecord.outcome],
      })),
      waitlist: session.waitlistEntries.map((entry, index) => ({
        waitlistEntryId: entry.id,
        clientId: entry.clientId,
        ...clientNameAndPhoto(entry.client),
        position: index + 1,
      })),
    };
  };
