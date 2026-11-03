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
  const quote = await quotesFounderPrice(transaction, clientId, rules, now);
  if (quote === null) return plans;
  const priced = priceFounderPlans(plans, {
    founder: true,
    percent: rules.founderDiscountPercent,
  });
  // BKM-019: the places left reach the Client only when 10 or fewer remain,
  // so the internal total of founder places never leaves the backend.
  const placesLeft = quote.placesLeft;
  if (placesLeft === null || placesLeft > launchPlacesShownFrom) return priced;
  return priced.map((plan) =>
    plan.listPriceCentavos === undefined
      ? plan
      : { ...plan, launchPlacesLeft: placesLeft },
  );
};

const launchPlacesShownFrom = 10;

const quotesFounderPrice = async (
  transaction: Transaction,
  clientId: string,
  rules: { founderPlaces: number },
  now: Date,
): Promise<{ placesLeft: number | null } | null> => {
  const { held, price } = await readFounderPrice(transaction, { clientId });
  if (price === 'list') return null;
  // A founder's renewal keeps 15 % whatever the places, so no count shows.
  const renewal = { placesLeft: null };
  if (price === 'founder') {
    if (held?.status !== FounderMembershipStatus.ACTIVE) return renewal;
    const today = todayOf(now);
    return (await founderGapWouldLose(transaction, {
      clientId,
      nextStart: today,
      today,
    }))
      ? null
      : renewal;
  }
  const placesTaken = await transaction.founderMembership.count({
    where: {
      deletedAt: null,
      status: {
        in: [FounderMembershipStatus.ACTIVE, FounderMembershipStatus.RESERVED],
      },
    },
  });
  return placesTaken < rules.founderPlaces
    ? { placesLeft: rules.founderPlaces - placesTaken }
    : null;
};
