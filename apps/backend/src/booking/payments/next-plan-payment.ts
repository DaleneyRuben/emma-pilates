import type { PrismaClient } from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';

// FIX-052 (walkthrough n.º 47): a Payment is for the Client's next Plan when
// another Subscription of hers is still in force today and ends before this
// Payment's Start Date (booking ADR-0005, ADR-0013). Once that one has ended,
// the Payment's Plan is simply her Plan.
export const isNextPlanPayment = async (
  prisma: Pick<PrismaClient, 'subscription'>,
  payment: { clientId: string; startsOn: Date; subscriptionId: string | null },
  now: Date,
): Promise<boolean> => {
  const current = await prisma.subscription.findFirst({
    where: {
      clientId: payment.clientId,
      state: 'ACTIVE',
      endsOn: { gte: boliviaDate(now), lt: payment.startsOn },
      ...(payment.subscriptionId === null
        ? {}
        : { id: { not: payment.subscriptionId } }),
    },
    select: { id: true },
  });
  return current !== null;
};
