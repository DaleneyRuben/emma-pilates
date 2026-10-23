import type { Prisma } from '../../generated/prisma/client';
import {
  AllowanceAdjustmentReason,
  AuditActorKind,
  AuditOutcome,
} from '../../generated/prisma/client';
import type { AdjustmentReason } from './allowance-adjustment-copy';
import { decideGiftClass, isFounder } from './gift-class';

type Transaction = Prisma.TransactionClient;

const reasonValues: Record<AdjustmentReason, AllowanceAdjustmentReason> = {
  gift_new_client: AllowanceAdjustmentReason.GIFT_NEW_CLIENT,
  invite_converted: AllowanceAdjustmentReason.INVITE_CONVERTED,
  campaign: AllowanceAdjustmentReason.CAMPAIGN,
  courtesy: AllowanceAdjustmentReason.COURTESY,
  class_return: AllowanceAdjustmentReason.CLASS_RETURN,
  consumption: AllowanceAdjustmentReason.CONSUMPTION,
};

export type AdjustmentAuthor = {
  accountId: string;
  /** The approving Account for a gift, the Administrator otherwise. */
  role: 'ADMINISTRATOR' | 'ASSISTANT' | 'TRAINER' | 'NUTRITIONIST' | null;
};

export type RecordedAdjustment = {
  id: string;
  classes: number;
  reason: AdjustmentReason;
};

// Writes the adjustment and its audit record in the caller's transaction, so
// the two commit together (ADR-0055). A gift is one per Client: the partial
// unique index makes a second one a conflict the caller treats as already
// applied.
export const recordAllowanceAdjustment = async (
  transaction: Transaction,
  input: {
    subscriptionId: string;
    clientId: string;
    classes: number;
    reason: AdjustmentReason;
    author: AdjustmentAuthor;
    now: Date;
    correlationId: string;
    /** A campaign's name lives in the audit: the adjustments are the record. */
    campaignName?: string;
  },
): Promise<RecordedAdjustment> => {
  const created = await transaction.allowanceAdjustment.create({
    data: {
      subscriptionId: input.subscriptionId,
      clientId: input.clientId,
      classes: input.classes,
      reason: reasonValues[input.reason],
      authorAccountId: input.author.accountId,
      createdAt: input.now,
    },
    select: { id: true },
  });
  await transaction.auditRecord.create({
    data: {
      actionCode: 'allowance_adjustment.recorded',
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.ACCOUNT,
      actorAccountId: input.author.accountId,
      actorRole: input.author.role,
      targetType: 'allowance_adjustment',
      targetId: created.id,
      correlationId: input.correlationId,
      occurredAt: input.now,
      metadata: {
        clientId: input.clientId,
        subscriptionId: input.subscriptionId,
        classes: input.classes,
        reason: input.reason,
        ...(input.campaignName === undefined
          ? {}
          : { campaignName: input.campaignName }),
      },
    },
  });
  return { id: created.id, classes: input.classes, reason: input.reason };
};

export type GiftGrant = {
  clientId: string;
  subscriptionId: string;
  paymentId: string;
  method: 'transfer' | 'cash' | 'credit_only' | 'courtesy';
  hidden: boolean;
  priceCentavos: number;
  /** BKM-010 replaces the constant false with the Founder Membership. */
  founder: boolean;
  earlierRealPayment: boolean;
  authorAccountId: string;
  authorRole: AdjustmentAuthor['role'];
  now: Date;
};

// Applies the gift once. A retry, a founder, and a courtesy or hidden Plan
// apply nothing; the unique index is the backstop when two confirmations race.
export const grantGiftClass = async (
  transaction: Transaction,
  grant: GiftGrant,
): Promise<RecordedAdjustment | null> => {
  const decision = decideGiftClass({
    founder: isFounder({ founder: grant.founder }),
    earlierRealPayment: grant.earlierRealPayment,
    payment: {
      method: grant.method,
      hidden: grant.hidden,
      priceCentavos: grant.priceCentavos,
    },
  });
  if (decision === null) return null;
  try {
    return await recordAllowanceAdjustment(transaction, {
      subscriptionId: grant.subscriptionId,
      clientId: grant.clientId,
      classes: decision.classes,
      reason: decision.reason,
      author: { accountId: grant.authorAccountId, role: grant.authorRole },
      now: grant.now,
      correlationId: grant.paymentId,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'P2002';
