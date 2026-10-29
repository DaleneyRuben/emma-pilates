import type { Prisma } from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';
import { hasSpendableExtra } from './net-allowance';

type Transaction = Prisma.TransactionClient;

const covering = (clientId: string, onDate: Date) => ({
  clientId,
  state: 'ACTIVE' as const,
  endsOn: { gte: boliviaDate(onDate) },
});

// The booking check reads Subscription.startsOn (booking ADR-0005): a Session
// before it is not eligible, and is reported apart from a spent allowance.
export const findCoveringSubscription = async (
  transaction: Transaction,
  input: { clientId: string; onDate: Date; needsAllowance: boolean },
) => {
  const subscription = await transaction.subscription.findFirst({
    where: {
      ...covering(input.clientId, input.onDate),
      startsOn: { lte: boliviaDate(input.onDate) },
      ...(input.needsAllowance
        ? {
            OR: [
              { remainingClassAllowance: { gt: 0 } },
              { allowanceAdjustments: { some: { deletedAt: null } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      remainingClassAllowance: true,
      allowanceAdjustments: {
        where: { deletedAt: null },
        select: { classes: true },
      },
    },
  });
  if (subscription === null) return null;
  if (!input.needsAllowance) return { id: subscription.id };
  if (
    subscription.remainingClassAllowance > 0 ||
    hasSpendableExtra(subscription.allowanceAdjustments)
  ) {
    return { id: subscription.id };
  }
  // A spent Guest Pass still covers her, so a second class answers
  // guest_pass_already_used instead of looking like no Subscription.
  const pass = await transaction.guestPass.findFirst({
    where: {
      friendClientId: input.clientId,
      courtesySubscriptionId: subscription.id,
      bookingId: { not: null },
      deletedAt: null,
    },
    select: { id: true },
  });
  return pass === null ? null : { id: subscription.id };
};

export const findNotYetStartedSubscription = (
  transaction: Transaction,
  input: { clientId: string; onDate: Date },
) =>
  transaction.subscription.findFirst({
    where: {
      ...covering(input.clientId, input.onDate),
      startsOn: { gt: boliviaDate(input.onDate) },
    },
    orderBy: [{ startsOn: 'asc' }, { id: 'asc' }],
    select: { startsOn: true },
  });
