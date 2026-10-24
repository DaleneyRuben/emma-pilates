import type { Prisma } from '../../generated/prisma/client';
import { consumeOneClass, linkConsumptionToBooking } from './consume-allowance';
import { baseRemainingAfterCap } from './weekly-cap';
import { readWeeklyCapPosition } from './weekly-cap-count';

type Transaction = Prisma.TransactionClient;

// Spends one class for a Booking. Past the weekly cap the base passed to
// chooseAllowanceSource is zero, so an extra class funds it and is linked
// to the Booking. Returns null when neither pool can fund it.
export const fundBooking = async (
  transaction: Transaction,
  input: {
    subscriptionId: string;
    clientId: string;
    authorAccountId: string;
    startsAt: Date;
    now: Date;
    excludeBookingId?: string;
    createBooking: () => Promise<{ id: string }>;
  },
): Promise<{ id: string } | null> => {
  const position = await readWeeklyCapPosition(transaction, input);
  const subscription = await transaction.subscription.findFirst({
    where: { id: input.subscriptionId, clientId: input.clientId },
    select: { remainingClassAllowance: true },
  });
  if (subscription === null) return null;
  const remaining = baseRemainingAfterCap({
    weeklyClassCap: position.weeklyClassCap,
    baseFundedBookings: position.baseFundedBookingsThisWeek,
    remainingClassAllowance: subscription.remainingClassAllowance,
    extraClasses: position.extraClasses,
  });
  if (
    position.weeklyClassCap !== null &&
    remaining.baseAvailable === 0 &&
    position.extraClasses <= 0
  ) {
    throw new Error('Weekly cap reached');
  }

  const source = await consumeOneClass(transaction, {
    subscriptionId: input.subscriptionId,
    clientId: input.clientId,
    authorAccountId: input.authorAccountId,
    now: input.now,
    baseAllowance: remaining.baseAvailable,
  });
  if (source === null) return null;

  const booking = await input.createBooking();
  if (source === 'extra') {
    await linkConsumptionToBooking(transaction, {
      subscriptionId: input.subscriptionId,
      bookingId: booking.id,
    });
  }
  return booking;
};
