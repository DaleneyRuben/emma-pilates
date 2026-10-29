import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  FounderMembershipStatus,
} from '../../generated/prisma/client';
import {
  decideFounderPlace,
  founderDiscount,
  isFounder,
  priceFounderPlans,
  showFounderPrice,
  type FounderRules,
} from './founder-membership';
import { hasEarlierPlanPayment } from './founder-plan-history';
import { reclaimMissingFounderPlace } from './founder-grant-audit';

type Transaction = Prisma.TransactionClient;

const founderLockKey = 'founder-membership-places';

export type FounderSale = {
  discountCentavos: number;
  discountReason: 'founder' | null;
  amountDueCentavos: number;
};

const readRules = async (transaction: Transaction): Promise<FounderRules> => {
  const version = await transaction.studioSettingsVersion.findFirst({
    orderBy: { version: 'desc' },
    select: {
      founderPlaces: true,
      founderDiscountPercent: true,
      founderGapDays: true,
    },
  });
  if (version === null) throw new Error('Studio Settings have no version');
  return version;
};

const founderStatusOf = (status: FounderMembershipStatus): 'active' | 'lost' =>
  status === FounderMembershipStatus.ACTIVE ? 'active' : 'lost';

// Active only. A lost or reserved membership answers false, which is the
// seam BKM-008 calls when the two branches meet.
export const readIsFounder = async (
  transaction: Transaction,
  clientId: string,
): Promise<boolean> => {
  const membership = await transaction.founderMembership.findFirst({
    where: { clientId, deletedAt: null },
    select: { status: true, clientId: true },
  });

  return isFounder(
    membership === null ? null : { status: founderStatusOf(membership.status) },
  );
};

// A Client who would take a place on her first real Plan sees the founder
// price before she buys. The sale still claims the place under the lock.
export const priceFounderPlanList = async <
  T extends {
    classAllowance: number;
    priceCentavos: number;
  },
>(
  transaction: Transaction,
  clientId: string | null,
  plans: T[],
): Promise<Array<T & { listPriceCentavos?: number }>> => {
  if (clientId === null) return plans;
  if (await hasEarlierPlanPayment(transaction, { clientId })) {
    return plans;
  }
  const rules = await readRules(transaction);
  const held = await transaction.founderMembership.findFirst({
    where: { clientId, deletedAt: null },
    select: { status: true },
  });
  const heldStatus =
    held === null
      ? 'none'
      : held.status === FounderMembershipStatus.LOST
        ? 'lost'
        : 'active';
  const placesTaken = await transaction.founderMembership.count({
    where: {
      deletedAt: null,
      status: {
        in: [FounderMembershipStatus.ACTIVE, FounderMembershipStatus.RESERVED],
      },
    },
  });
  if (
    !showFounderPrice({
      held: heldStatus,
      placesRemaining: placesTaken < rules.founderPlaces,
    })
  ) {
    return plans;
  }
  return priceFounderPlans(plans, {
    founder: true,
    percent: rules.founderDiscountPercent,
  });
};

export const readFounderRenewal = async (
  transaction: Transaction,
  clientId: string,
): Promise<{ gapDays: number } | null> => {
  if (!(await readIsFounder(transaction, clientId))) return null;
  const rules = await readRules(transaction);
  return { gapDays: rules.founderGapDays };
};

// The list price stays on the Payment; the discount is stored beside it.
export const priceFounderSale = async (
  transaction: Transaction,
  input: {
    clientId: string;
    classAllowance: number;
    priceCentavos: number;
    creditAppliedCentavos: number;
    now: Date;
    courtesy: boolean;
    hidden: boolean;
    skipClaim?: boolean;
    activate: boolean;
    purchaseIntentId?: string;
    paymentId?: string;
  },
): Promise<FounderSale> => {
  const founder = await claimFounderPlace(transaction, {
    clientId: input.clientId,
    now: input.now,
    courtesy: input.courtesy,
    hidden: input.hidden,
    skipClaim: input.skipClaim === true,
    priceCentavos: input.priceCentavos,
    classAllowance: input.classAllowance,
    purchaseIntentId: input.purchaseIntentId,
    paymentId: input.paymentId,
    activate: input.activate,
  });
  if (!founder.founder) {
    return {
      discountCentavos: 0,
      discountReason: null,
      amountDueCentavos: input.priceCentavos - input.creditAppliedCentavos,
    };
  }
  const rules = await readRules(transaction);
  const priced = founderDiscount({
    classAllowance: input.classAllowance,
    priceCentavos: input.priceCentavos,
    percent: rules.founderDiscountPercent,
  });
  const amountDueCentavos = Math.max(
    0,
    priced.amountDueCentavos - input.creditAppliedCentavos,
  );
  return {
    discountCentavos: priced.discountCentavos,
    discountReason: priced.discountCentavos > 0 ? 'founder' : null,
    amountDueCentavos,
  };
};

const auditGranted = (
  transaction: Transaction,
  input: {
    membershipId: string;
    clientId: string;
    number: number;
    paymentId: string;
    now: Date;
  },
) =>
  transaction.auditRecord.create({
    data: {
      actionCode: 'founder_membership.granted',
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.SYSTEM,
      targetType: 'founder_membership',
      targetId: input.membershipId,
      correlationId: input.paymentId,
      occurredAt: input.now,
      metadata: {
        clientId: input.clientId,
        number: input.number,
        paymentId: input.paymentId,
      },
    },
  });

// Courtesy Access calls this and never takes a place. A real sale claims
// through priceFounderSale instead.
export const grantFounderPlace = async (
  transaction: Transaction,
  input: { clientId: string; paymentId: string; now: Date; courtesy: boolean },
): Promise<{ granted: boolean; number: number | null }> => {
  if (input.courtesy) return { granted: false, number: null };
  const claimed = await claimFounderPlace(transaction, {
    clientId: input.clientId,
    now: input.now,
    courtesy: false,
    hidden: false,
    priceCentavos: 1,
    classAllowance: 2,
    paymentId: input.paymentId,
    activate: true,
  });
  return { granted: claimed.founder, number: claimed.number };
};

const lockFounderPlaces = (transaction: Transaction) =>
  transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${founderLockKey}, 0))`;

const qualifiesForAPlace = (input: {
  courtesy: boolean;
  hidden: boolean;
  priceCentavos: number;
  classAllowance: number;
}): boolean =>
  !input.courtesy &&
  !input.hidden &&
  input.priceCentavos > 0 &&
  input.classAllowance > singleClassAllowance();

const singleClassAllowance = (): number => 1;

type PlaceClaim = {
  clientId: string;
  now: Date;
  courtesy: boolean;
  hidden: boolean;
  skipClaim?: boolean;
  priceCentavos: number;
  classAllowance: number;
  purchaseIntentId?: string;
  paymentId?: string;
  activate: boolean;
};

// The advisory lock is taken before any read of founder places. A cash sale
// activates in the same transaction; a transfer reserves until confirmation.
export const claimFounderPlace = async (
  transaction: Transaction,
  input: PlaceClaim,
): Promise<{ founder: boolean; number: number | null }> => {
  if (!qualifiesForAPlace(input) || input.skipClaim === true) {
    return { founder: false, number: null };
  }
  await lockFounderPlaces(transaction);

  const held = await transaction.founderMembership.findFirst({
    where: { clientId: input.clientId, deletedAt: null },
    select: { id: true, status: true, number: true },
  });
  if (held?.status === FounderMembershipStatus.ACTIVE) {
    return { founder: true, number: held.number };
  }
  if (held?.status === FounderMembershipStatus.LOST) {
    return { founder: false, number: null };
  }
  if (
    await hasEarlierPlanPayment(transaction, {
      clientId: input.clientId,
      paymentId: input.paymentId,
    })
  ) {
    return { founder: false, number: null };
  }
  if (held?.status === FounderMembershipStatus.RESERVED) {
    if (input.activate) {
      await transaction.founderMembership.update({
        where: { id: held.id },
        data: {
          status: FounderMembershipStatus.ACTIVE,
          paymentId: input.paymentId ?? null,
          purchaseIntentId: null,
        },
      });
    }
    return { founder: true, number: held.number };
  }

  const rules = await readRules(transaction);
  const [assigned, highest] = await Promise.all([
    transaction.founderMembership.count({
      where: {
        deletedAt: null,
        status: {
          in: [
            FounderMembershipStatus.ACTIVE,
            FounderMembershipStatus.RESERVED,
          ],
        },
      },
    }),
    transaction.founderMembership.aggregate({ _max: { number: true } }),
  ]);
  const decision = decideFounderPlace({
    places: rules.founderPlaces,
    assigned,
    nextNumber: (highest._max.number ?? 0) + 1,
    alreadyHeld: false,
    courtesy: false,
  });
  if (!decision.assign) return { founder: false, number: null };

  const created = await transaction.founderMembership.create({
    data: {
      clientId: input.clientId,
      number: decision.number,
      since: input.now,
      status: input.activate
        ? FounderMembershipStatus.ACTIVE
        : FounderMembershipStatus.RESERVED,
      purchaseIntentId: input.activate
        ? null
        : (input.purchaseIntentId ?? null),
      paymentId: input.activate ? null : (input.paymentId ?? null),
    },
    select: { id: true, number: true },
  });
  if (input.activate && input.paymentId !== undefined) {
    await auditGranted(transaction, {
      membershipId: created.id,
      clientId: input.clientId,
      number: created.number,
      paymentId: input.paymentId,
      now: input.now,
    });
  }
  return { founder: true, number: created.number };
};

// Confirmation of a transfer locks again, then flips the reservation. A cash
// sale already activated it while pricing.
export const confirmFounderPlace = async (
  transaction: Transaction,
  input: { clientId: string; paymentId: string; now: Date },
): Promise<void> => {
  await lockFounderPlaces(transaction);
  const held = await transaction.founderMembership.findFirst({
    where: { clientId: input.clientId, deletedAt: null },
    select: { id: true, status: true, number: true },
  });
  if (held === null) {
    await reclaimMissingFounderPlace(transaction, input);
    return;
  }
  if (held.status !== FounderMembershipStatus.RESERVED) return;
  await transaction.founderMembership.update({
    where: { id: held.id },
    data: {
      status: FounderMembershipStatus.ACTIVE,
      since: input.now,
      paymentId: input.paymentId,
      purchaseIntentId: null,
    },
  });
  await auditGranted(transaction, {
    membershipId: held.id,
    clientId: input.clientId,
    number: held.number,
    paymentId: input.paymentId,
    now: input.now,
  });
};
