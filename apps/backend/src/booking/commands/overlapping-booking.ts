import type { Prisma } from '../../generated/prisma/client';
import { BookingState } from '../../generated/prisma/client';

type Window = { clientId: string; startsAt: Date; endsAt: Date };

// The one overlap rule: a live Booking of hers whose class shares any minute
// with this one. Creating, rescheduling and promoting from the waitlist
// refuse on it; the class detail reads it ahead (walkthrough n.º 1).
export const overlappingBookingWhere = ({
  clientId,
  startsAt,
  endsAt,
}: Window): Prisma.BookingWhereInput => ({
  clientId,
  state: BookingState.BOOKED,
  session: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
});

export type OwnBookingAround = {
  /** `this_class`: she booked this very class; `overlapping`: another one at that time. */
  relation: 'this_class' | 'overlapping';
  bookingId: string;
  classTypeName: string;
  startsAt: Date;
  endsAt: Date;
};

const bookingSelect = {
  id: true,
  session: {
    select: {
      startsAt: true,
      endsAt: true,
      classType: { select: { name: true } },
    },
  },
} as const;

/** Her Booking on this class, or else one that overlaps it (C04p, C04q). */
export const findOwnBookingAround = async (
  db: Pick<Prisma.TransactionClient, 'booking'>,
  input: Window & { sessionId: string },
): Promise<OwnBookingAround | null> => {
  const own = await db.booking.findFirst({
    where: { ...overlappingBookingWhere(input), sessionId: input.sessionId },
    select: bookingSelect,
  });
  const found =
    own ??
    (await db.booking.findFirst({
      where: overlappingBookingWhere(input),
      orderBy: [{ session: { startsAt: 'asc' } }, { id: 'asc' }],
      select: bookingSelect,
    }));
  if (found === null) return null;
  return {
    relation: own === null ? 'overlapping' : 'this_class',
    bookingId: found.id,
    classTypeName: found.session.classType.name,
    startsAt: found.session.startsAt,
    endsAt: found.session.endsAt,
  };
};
