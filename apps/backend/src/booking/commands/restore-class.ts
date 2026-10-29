import type { Prisma } from '../../generated/prisma/client';
import { AllowanceAdjustmentReason } from '../../generated/prisma/client';

type Transaction = Prisma.TransactionClient;

// An extra-funded Booking names its consumption row. Returning that class
// to the base allowance can break remaining <= original. Reverse the
// consumption instead, and leave the base pool alone.
export const restoreBookedClass = async (
  transaction: Transaction,
  input: {
    bookingId: string;
    subscriptionId: string;
    clientId: string;
    now: Date;
  },
): Promise<void> => {
  const reversed = await transaction.allowanceAdjustment.updateMany({
    where: {
      bookingId: input.bookingId,
      subscriptionId: input.subscriptionId,
      clientId: input.clientId,
      reason: AllowanceAdjustmentReason.CONSUMPTION,
      deletedAt: null,
    },
    data: { deletedAt: input.now },
  });
  if (reversed.count > 0) return;

  const restored = await transaction.subscription.updateMany({
    where: { id: input.subscriptionId, clientId: input.clientId },
    data: { remainingClassAllowance: { increment: 1 } },
  });
  if (restored.count !== 1) {
    throw new Error('Booking Subscription is unavailable');
  }
};

// A same-week reschedule keeps the class already spent. The consumption
// moves to the replacement Booking, so the weekly cap does not see a new
// extra class.
export const moveConsumptionToBooking = (
  transaction: Transaction,
  input: { fromBookingId: string; toBookingId: string },
): Promise<unknown> =>
  transaction.allowanceAdjustment.updateMany({
    where: {
      bookingId: input.fromBookingId,
      reason: AllowanceAdjustmentReason.CONSUMPTION,
      deletedAt: null,
    },
    data: { bookingId: input.toBookingId },
  });
