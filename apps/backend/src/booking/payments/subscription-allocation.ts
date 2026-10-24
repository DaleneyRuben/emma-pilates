import type { Prisma } from '../../generated/prisma/client';
import { SubscriptionState } from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import { boliviaDate } from '../../time/bolivia-time';
import type { ActiveSubscriptionFacts } from './purchase-eligibility';

type Transaction = Prisma.TransactionClient;

// Shared by every way a Subscription is allocated (a sale or Courtesy
// Access): the Client's current Subscription, the one already in force, with
// what decides whether it is still effective. A future Subscription is a
// separate row and must not hide this one.
export const loadActiveSubscription = async (
  transaction: Transaction,
  clientId: string,
  now: Date,
): Promise<ActiveSubscriptionFacts | null> => {
  const today = boliviaDate(now);
  const active = await transaction.subscription.findFirst({
    where: {
      clientId,
      state: SubscriptionState.ACTIVE,
      startsOn: { lte: today },
    },
    orderBy: [{ endsOn: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      startsOn: true,
      endsOn: true,
      remainingClassAllowance: true,
      _count: {
        select: {
          bookings: {
            where: { state: 'BOOKED', session: { startsAt: { gt: now } } },
          },
        },
      },
    },
  });
  return active === null
    ? null
    : {
        id: active.id,
        startsOn: active.startsOn,
        endsOn: active.endsOn,
        remainingClassAllowance: active.remainingClassAllowance,
        futureBookedCount: active._count.bookings,
      };
};

export const expireSubscription = (
  transaction: Transaction,
  subscriptionId: string,
  now: Date,
) =>
  transaction.subscription.update({
    where: { id: subscriptionId },
    data: { state: SubscriptionState.EXPIRED, expiredAt: now },
  });

export const notifyPaymentConfirmed = async (
  recordNotification: NotificationRecorder,
  transaction: Transaction,
  input: {
    clientId: string;
    paymentId: string;
    subscriptionId: string;
    now: Date;
  },
): Promise<void> => {
  const client = await transaction.client.findUniqueOrThrow({
    where: { id: input.clientId },
    select: { account: { select: { id: true } } },
  });
  if (client.account === null) return;
  await recordNotification(transaction, {
    accountId: client.account.id,
    category: 'subscription_payment',
    type: 'payment_confirmed',
    businessEventKey: `payment-confirmed:${input.paymentId}`,
    title: 'Pago confirmado',
    message: 'Tu pago fue confirmado. ¡Ya puedes reservar clases!',
    destination: { type: 'subscription', id: input.subscriptionId },
    occurredAt: input.now,
  });
};
