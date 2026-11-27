import type { Prisma } from '../../generated/prisma/client';
import {
  PaymentMethod,
  SubscriptionState,
} from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';

type Reader = Pick<Prisma.TransactionClient, 'subscription'>;

// Walkthrough n.º 22 (owner, 26 Nov): a Client's code opens a Guest Pass
// only while she has a paid Plan in force. A Courtesy Access and her own
// Guest Pass are both courtesy Payments, so neither counts. A Subscription
// with no Payment is a Plan sold before the app recorded payments.
export const hasActivePaidPlan = async (
  reader: Reader,
  clientId: string,
  now: Date,
): Promise<boolean> => {
  const today = boliviaDate(now);
  const paid = await reader.subscription.findFirst({
    where: {
      clientId,
      state: SubscriptionState.ACTIVE,
      startsOn: { lte: today },
      endsOn: { gte: today },
      OR: [
        { paymentId: null },
        {
          payment: {
            method: { not: PaymentMethod.COURTESY },
            voidedAt: null,
          },
        },
      ],
    },
    select: { id: true },
  });
  return paid !== null;
};
