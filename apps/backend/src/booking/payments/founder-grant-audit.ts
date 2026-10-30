import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  FounderMembershipStatus,
} from '../../generated/prisma/client';
import { PaymentRuleError } from './payment-errors';
import { claimFounderPlace } from './prisma-founder-membership';

type Transaction = Prisma.TransactionClient;

// A cash sale activates the place before the Payment exists, so the grant
// audit is written here, once the Payment has an id.
export const auditCashFounderGrant = async (
  transaction: Transaction,
  input: { clientId: string; paymentId: string; now: Date },
): Promise<void> => {
  const held = await transaction.founderMembership.findFirst({
    where: {
      clientId: input.clientId,
      status: FounderMembershipStatus.ACTIVE,
      paymentId: null,
      deletedAt: null,
    },
    select: { id: true, number: true },
  });
  if (held === null) return;
  await transaction.founderMembership.update({
    where: { id: held.id },
    data: { paymentId: input.paymentId },
  });
  await transaction.auditRecord.create({
    data: {
      actionCode: 'founder_membership.granted',
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.SYSTEM,
      targetType: 'founder_membership',
      targetId: held.id,
      correlationId: input.paymentId,
      occurredAt: input.now,
      metadata: {
        clientId: input.clientId,
        number: held.number,
        paymentId: input.paymentId,
      },
    },
  });
};

// Confirmation of a founder-priced transfer whose reservation was released
// claims the place again. A list-price payment is left alone.
export const reclaimMissingFounderPlace = async (
  transaction: Transaction,
  input: { clientId: string; paymentId: string; now: Date },
): Promise<void> => {
  const payment = await transaction.payment.findUnique({
    where: { id: input.paymentId },
    select: {
      discountReason: true,
      planPriceCentavos: true,
      plan: { select: { classAllowance: true, hiddenAt: true } },
    },
  });
  if (payment?.discountReason !== 'founder' || payment.plan === null) return;
  const claimed = await claimFounderPlace(transaction, {
    clientId: input.clientId,
    now: input.now,
    courtesy: false,
    hidden: payment.plan.hiddenAt !== null,
    priceCentavos: payment.planPriceCentavos,
    classAllowance: payment.plan.classAllowance,
    paymentId: input.paymentId,
    activate: true,
    // The Client paid the founder price; a late review is the desk's fault,
    // so she keeps it and the place, over the cap (owner 2026-10-30).
    overCap: true,
  });
  if (!claimed.founder) {
    throw new PaymentRuleError(
      'payment_confirmation_conflict',
      'No founder place remains for this confirmation',
    );
  }
  const held = await transaction.founderMembership.findFirst({
    where: {
      clientId: input.clientId,
      status: FounderMembershipStatus.ACTIVE,
      deletedAt: null,
    },
    select: { id: true, paymentId: true },
  });
  if (held !== null && held.paymentId === null) {
    await transaction.founderMembership.update({
      where: { id: held.id },
      data: { paymentId: input.paymentId },
    });
  }
};
