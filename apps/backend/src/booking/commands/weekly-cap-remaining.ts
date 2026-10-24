import type { PrismaClient } from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';
import { baseRemainingAfterCap } from './weekly-cap';
import { countBaseFundedBookings } from './weekly-cap-count';

// Classes left this week for the Client's active Subscription. Null when
// there is no cap, so a screen shows nothing.
export const classesLeftThisWeek = async (
  prisma: PrismaClient,
  clientId: string,
  at: Date,
): Promise<number | null> => {
  const day = boliviaDate(at);
  const subscription = await prisma.subscription.findFirst({
    where: {
      clientId,
      state: 'ACTIVE',
      startsOn: { lte: day },
      endsOn: { gte: day },
    },
    select: { id: true, weeklyClassCapSnapshot: true },
  });
  if (subscription === null || subscription.weeklyClassCapSnapshot === null) {
    return null;
  }
  const booked = await prisma.$transaction((transaction) =>
    countBaseFundedBookings(transaction, {
      subscriptionId: subscription.id,
      startsAt: at,
    }),
  );
  return baseRemainingAfterCap({
    weeklyClassCap: subscription.weeklyClassCapSnapshot,
    baseFundedBookings: booked,
    remainingClassAllowance: subscription.weeklyClassCapSnapshot,
    extraClasses: 0,
  }).classesLeftThisWeek;
};
