import type { Prisma } from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';

type Transaction = Prisma.TransactionClient;

const covering = (clientId: string, onDate: Date) => ({
  clientId,
  state: 'ACTIVE' as const,
  endsOn: { gte: boliviaDate(onDate) },
});

// The booking check reads Subscription.startsOn (booking ADR-0005): a Session
// before it is not eligible, and is reported apart from a spent allowance.
export const findCoveringSubscription = (
  transaction: Transaction,
  input: { clientId: string; onDate: Date; needsAllowance: boolean },
) =>
  transaction.subscription.findFirst({
    where: {
      ...covering(input.clientId, input.onDate),
      startsOn: { lte: boliviaDate(input.onDate) },
      ...(input.needsAllowance
        ? {
            OR: [
              { remainingClassAllowance: { gt: 0 } },
              {
                allowanceAdjustments: {
                  some: { deletedAt: null, classes: { gt: 0 } },
                },
              },
            ],
          }
        : {}),
    },
    select: { id: true },
  });

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
