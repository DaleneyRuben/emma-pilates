import type { Prisma } from '../../generated/prisma/client';
import { FounderMembershipStatus } from '../../generated/prisma/client';
import { founderGapWouldLose } from './founder-gap';
import { priceFounderPlans } from './founder-membership';
import {
  readFounderPrice,
  readFounderRules,
} from './prisma-founder-membership';
import { todayOf } from './prisma-start-date-allocation';

type Transaction = Prisma.TransactionClient;

// The list the Client and the Assistant read is priced by the same rule the
// sale charges with (readFounderPrice): a founder sees 15 % on every renewal,
// a first Plan sees it while a place is free, and a gap that the sale would
// count as lost already shows the list price.
export const priceFounderPlanList = async <
  T extends {
    classAllowance: number;
    priceCentavos: number;
  },
>(
  transaction: Transaction,
  clientId: string | null,
  plans: T[],
  now: Date = new Date(),
): Promise<
  Array<T & { listPriceCentavos?: number; launchPlacesLeft?: number }>
> => {
  if (clientId === null) return plans;
  const rules = await readFounderRules(transaction);
  if (!(await quotesFounderPrice(transaction, clientId, rules, now))) {
    return plans;
  }
  return priceFounderPlans(plans, {
    founder: true,
    percent: rules.founderDiscountPercent,
  });
};

const quotesFounderPrice = async (
  transaction: Transaction,
  clientId: string,
  rules: { founderPlaces: number },
  now: Date,
): Promise<boolean> => {
  const { held, price } = await readFounderPrice(transaction, { clientId });
  if (price === 'list') return false;
  if (price === 'founder') {
    if (held?.status !== FounderMembershipStatus.ACTIVE) return true;
    const today = todayOf(now);
    return !(await founderGapWouldLose(transaction, {
      clientId,
      nextStart: today,
      today,
    }));
  }
  const placesTaken = await transaction.founderMembership.count({
    where: {
      deletedAt: null,
      status: {
        in: [FounderMembershipStatus.ACTIVE, FounderMembershipStatus.RESERVED],
      },
    },
  });
  return placesTaken < rules.founderPlaces;
};
