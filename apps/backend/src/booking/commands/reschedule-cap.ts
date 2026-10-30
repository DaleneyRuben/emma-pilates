import type { Prisma } from '../../generated/prisma/client';
import { AllowanceAdjustmentReason } from '../../generated/prisma/client';
import { readWeeklyCapPosition } from './weekly-cap-count';

type Transaction = Prisma.TransactionClient;

// A class already paid from the extra pool is a move, not a new use of the
// weekly cap. The reason lives here so the booking adapter does not name it.
export const weeklyCapBlocksReschedule = async (
  transaction: Transaction,
  input: {
    subscriptionId: string;
    startsAt: Date;
    excludeBookingId: string;
  },
): Promise<boolean> => {
  const moved = await transaction.allowanceAdjustment.findFirst({
    where: {
      bookingId: input.excludeBookingId,
      reason: AllowanceAdjustmentReason.CONSUMPTION,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (moved !== null) return false;
  const position = await readWeeklyCapPosition(transaction, input);
  return (
    position.weeklyClassCap !== null &&
    position.baseFundedBookingsThisWeek >= position.weeklyClassCap &&
    position.extraClasses <= 0
  );
};
