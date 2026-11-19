import type { Prisma } from '../../generated/prisma/client';
import { staffPhotoOf } from '../staff/photo/staff-photo-of';
import type { UpcomingClientBooking } from '../client/client-bookings';
import { nameInitials } from '../client/name-initials';

const sessionFacts = {
  id: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  classType: { select: { name: true } },
  trainer: { select: { name: true, profileImageAssetId: true } },
  branch: { select: { id: true, name: true } },
  bookings: {
    where: { state: 'BOOKED' as const },
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
    select: { clientId: true, client: { select: { name: true } } },
  },
} satisfies Prisma.SessionSelect;

/**
 * The Client's upcoming Bookings and active Waitlist Entries in start order,
 * with who else is coming by initials only (never another Client's name).
 */
export const findUpcomingClientBookings =
  (prisma: Prisma.TransactionClient) =>
  async ({
    clientId,
    from,
  }: {
    clientId: string;
    from: Date;
  }): Promise<UpcomingClientBooking[]> => {
    const upcoming = { state: 'SCHEDULED', startsAt: { gt: from } } as const;
    const [bookings, entries] = await Promise.all([
      prisma.booking.findMany({
        where: { clientId, state: 'BOOKED', session: upcoming },
        select: { id: true, session: { select: sessionFacts } },
      }),
      prisma.waitlistEntry.findMany({
        where: { clientId, closedAt: null, session: upcoming },
        select: { id: true, session: { select: sessionFacts } },
      }),
    ]);
    const facts = (session: (typeof bookings)[number]['session']) => ({
      sessionId: session.id,
      branchId: session.branch.id,
      classTypeName: session.classType.name,
      trainerName: session.trainer.name,
      trainerPhoto: staffPhotoOf(session.trainer.profileImageAssetId),
      branchName: session.branch.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      capacity: session.capacity,
      bookedCount: session.bookings.length,
      attendeeInitials: session.bookings
        .filter((booking) => booking.clientId !== clientId)
        .map((booking) => nameInitials(booking.client.name)),
    });

    return [
      ...bookings.map((booking) => ({
        kind: 'booking' as const,
        bookingId: booking.id,
        ...facts(booking.session),
      })),
      ...entries.map((entry) => ({
        kind: 'waitlist' as const,
        waitlistEntryId: entry.id,
        ...facts(entry.session),
      })),
    ].sort(
      (left, right) =>
        left.startsAt.getTime() - right.startsAt.getTime() ||
        left.sessionId.localeCompare(right.sessionId),
    );
  };
