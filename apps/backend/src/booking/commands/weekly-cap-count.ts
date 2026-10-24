import type { Prisma } from '../../generated/prisma/client';
import { boliviaInstant } from '../../time/bolivia-time';
import { boliviaWeek } from './weekly-cap';

type Transaction = Prisma.TransactionClient;

// Base-funded Bookings in the week: confirmed Bookings whose id no live
// consumption adjustment names. The released Booking of a same-week
// Reschedule is excluded by the caller, because it frees its own place.
export const countBaseFundedBookings = async (
  transaction: Transaction,
  input: {
    subscriptionId: string;
    startsAt: Date;
    excludeBookingId?: string;
  },
): Promise<number> => {
  const week = boliviaWeek(input.startsAt);
  const funded = await transaction.allowanceAdjustment.findMany({
    where: {
      subscriptionId: input.subscriptionId,
      reason: 'CONSUMPTION',
      deletedAt: null,
      bookingId: { not: null },
    },
    select: { bookingId: true },
  });
  const fundedIds = funded.flatMap((row) =>
    row.bookingId === null ? [] : [row.bookingId],
  );
  const excluded = [
    ...(input.excludeBookingId === undefined ? [] : [input.excludeBookingId]),
    ...fundedIds,
  ];
  return transaction.booking.count({
    where: {
      subscriptionId: input.subscriptionId,
      state: 'BOOKED',
      ...(excluded.length === 0 ? {} : { id: { notIn: excluded } }),
      session: {
        startsAt: {
          gte: boliviaInstant(week.startsOn, 0),
          lt: boliviaInstant(week.endsOn, 24 * 60),
        },
      },
    },
  });
};

export const readWeeklyCapPosition = async (
  transaction: Transaction,
  input: { subscriptionId: string; startsAt: Date; excludeBookingId?: string },
): Promise<{
  weeklyClassCap: number | null;
  baseFundedBookingsThisWeek: number;
  extraClasses: number;
}> => {
  const subscription = await transaction.subscription.findUniqueOrThrow({
    where: { id: input.subscriptionId },
    select: { weeklyClassCapSnapshot: true },
  });
  const extra = await transaction.allowanceAdjustment.aggregate({
    where: { subscriptionId: input.subscriptionId, deletedAt: null },
    _sum: { classes: true },
  });
  return {
    weeklyClassCap: subscription.weeklyClassCapSnapshot,
    baseFundedBookingsThisWeek: await countBaseFundedBookings(
      transaction,
      input,
    ),
    extraClasses: extra._sum.classes ?? 0,
  };
};
