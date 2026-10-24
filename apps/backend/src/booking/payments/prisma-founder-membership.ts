import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  FounderMembershipStatus,
  PaymentMethod,
} from '../../generated/prisma/client';
import {
  decideFounderPlace,
  founderDiscount,
  isFounder,
  priceFounderPlans,
  type FounderRules,
} from './founder-membership';

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

// Active only. A lost membership answers false, which is the seam BKM-008
// calls when the two branches meet.
export const readIsFounder = async (
  transaction: Transaction,
  clientId: string,
): Promise<boolean> => {
  const membership = await transaction.founderMembership.findFirst({
    where: { clientId, deletedAt: null },
    select: { status: true },
  });
  return isFounder(
    membership === null
      ? null
      : {
          status:
            membership.status === FounderMembershipStatus.ACTIVE
              ? 'active'
              : 'lost',
        },
  );
};

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
  if (clientId === null || !(await readIsFounder(transaction, clientId))) {
    return plans;
  }
  const rules = await readRules(transaction);
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
  },
): Promise<FounderSale> => {
  const founder = await readIsFounder(transaction, input.clientId);
  if (!founder) {
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

// The first real confirmed Payment of a Client who does not already hold
// one. Courtesy Access never takes a place. The advisory lock serializes
// the numbering; the unique number is the backstop.
export const grantFounderPlace = async (
  transaction: Transaction,
  input: { clientId: string; paymentId: string; now: Date; courtesy: boolean },
): Promise<{ granted: boolean; number: number | null }> => {
  if (input.courtesy) return { granted: false, number: null };
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${founderLockKey}, 0))`;

  const held = await transaction.founderMembership.findFirst({
    where: { clientId: input.clientId, deletedAt: null },
    select: { id: true },
  });
  const rules = await readRules(transaction);
  const assigned = await transaction.founderMembership.count({
    where: { deletedAt: null },
  });
  const decision = decideFounderPlace({
    places: rules.founderPlaces,
    assigned,
    alreadyHeld: held !== null,
    courtesy: false,
  });
  if (!decision.assign) return { granted: false, number: null };

  const created = await transaction.founderMembership.create({
    data: {
      clientId: input.clientId,
      number: decision.number,
      since: input.now,
      status: FounderMembershipStatus.ACTIVE,
    },
    select: { id: true, number: true },
  });
  await auditGranted(transaction, {
    membershipId: created.id,
    clientId: input.clientId,
    number: created.number,
    paymentId: input.paymentId,
    now: input.now,
  });
  return { granted: true, number: created.number };
};

export const founderSaleOf = (input: {
  method: PaymentMethod;
  classAllowance: number;
  priceCentavos: number;
  creditAppliedCentavos: number;
  discount: FounderSale;
}): {
  creditAppliedCentavos: number;
  discountCentavos: number;
  discountReason: string | null;
  amountDueCentavos: number;
  method: PaymentMethod;
} => {
  const creditAppliedCentavos = Math.min(
    input.creditAppliedCentavos,
    input.priceCentavos - input.discount.discountCentavos,
  );
  const amountDueCentavos =
    input.priceCentavos -
    input.discount.discountCentavos -
    creditAppliedCentavos;
  return {
    creditAppliedCentavos,
    discountCentavos: input.discount.discountCentavos,
    discountReason: input.discount.discountReason,
    amountDueCentavos,
    method:
      input.method === PaymentMethod.COURTESY
        ? input.method
        : amountDueCentavos === 0
          ? PaymentMethod.CREDIT_ONLY
          : input.method,
  };
};
