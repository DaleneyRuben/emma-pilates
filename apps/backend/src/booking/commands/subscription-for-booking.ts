import type { Prisma } from '../../generated/prisma/client';
import { findCoveringSubscription } from './eligible-subscription';
import { readWeeklyCapPosition } from './weekly-cap-count';

// The Subscription a new Booking or Waitlist Entry would spend, with its
// weekly cap position for the Session's week.
export async function findSubscriptionForBooking(
  transaction: Prisma.TransactionClient,
  input: { clientId: string; onDate: Date; needsAllowance: boolean },
) {
  const subscription = await findCoveringSubscription(transaction, input);
  if (subscription === null) return null;
  return {
    id: subscription.id,
    ...(await readWeeklyCapPosition(transaction, {
      subscriptionId: subscription.id,
      startsAt: input.onDate,
    })),
  };
}
