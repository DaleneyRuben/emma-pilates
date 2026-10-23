import type { Prisma } from '../../generated/prisma/client';
import { AllowanceAdjustmentReason } from '../../generated/prisma/client';
import { chooseAllowanceSource } from './allowance-consumption';

type Transaction = Prisma.TransactionClient;

// Live extra classes: the signed sum of the Subscription's adjustments.
export const readExtraClasses = async (
  transaction: Transaction,
  subscriptionId: string,
): Promise<number> => {
  const sum = await transaction.allowanceAdjustment.aggregate({
    where: { subscriptionId, deletedAt: null },
    _sum: { classes: true },
  });
  return sum._sum.classes ?? 0;
};

// Spends one class, base first, then an extra class. Returns false when
// neither pool holds one. The base decrement is conditional so two Bookings
// cannot spend the last base class; the extra spend is its own negative
// adjustment, so the origin of the granted class stays on its own row.
export const consumeOneClass = async (
  transaction: Transaction,
  input: {
    subscriptionId: string;
    clientId: string;
    authorAccountId: string;
    now: Date;
    // BKM-007 passes zero once the weekly cap blocks the base allowance.
    baseAllowance?: number;
  },
): Promise<'base' | 'extra' | null> => {
  const subscription = await transaction.subscription.findFirst({
    where: { id: input.subscriptionId, clientId: input.clientId },
    select: { remainingClassAllowance: true },
  });
  if (subscription === null) return null;

  const source = chooseAllowanceSource({
    remainingClassAllowance:
      input.baseAllowance ?? subscription.remainingClassAllowance,
    extraClasses: await readExtraClasses(transaction, input.subscriptionId),
  });
  if (source === null) return null;

  if (source === 'base') {
    const consumed = await transaction.subscription.updateMany({
      where: {
        id: input.subscriptionId,
        clientId: input.clientId,
        remainingClassAllowance: { gt: 0 },
      },
      data: { remainingClassAllowance: { decrement: 1 } },
    });
    return consumed.count === 1 ? 'base' : null;
  }

  // class_return is an Administrator's grant (PAY-006). Spending an extra
  // class records its own reason, so the grant's origin stays visible.
  const granted = await transaction.allowanceAdjustment.aggregate({
    where: {
      subscriptionId: input.subscriptionId,
      deletedAt: null,
      classes: { gt: 0 },
    },
    _sum: { classes: true },
  });
  if ((granted._sum.classes ?? 0) <= 0) return null;
  await transaction.allowanceAdjustment.create({
    data: {
      subscriptionId: input.subscriptionId,
      clientId: input.clientId,
      classes: -1,
      reason: AllowanceAdjustmentReason.CONSUMPTION,
      authorAccountId: input.authorAccountId,
      createdAt: input.now,
    },
  });
  return 'extra';
};

// The consumption row is written before the Booking exists. The cap count
// needs the Booking id, so the caller links it once the Booking is created.
export const linkConsumptionToBooking = (
  transaction: Transaction,
  input: { subscriptionId: string; bookingId: string },
): Promise<unknown> =>
  transaction.allowanceAdjustment.updateMany({
    where: {
      subscriptionId: input.subscriptionId,
      reason: AllowanceAdjustmentReason.CONSUMPTION,
      bookingId: null,
      deletedAt: null,
    },
    data: { bookingId: input.bookingId },
  });
