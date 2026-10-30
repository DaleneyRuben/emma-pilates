import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  EvaluationCancellationCause,
  EvaluationState,
  SubscriptionState,
  WaitlistClosureReason,
} from '../../generated/prisma/client';
import type { AuditActor } from '../../system-identity/authentication/audit-actor';
import {
  boliviaDate,
  boliviaInstant,
  addCivilDays,
} from '../../time/bolivia-time';
import { releaseSlot } from '../evaluations/evaluation-slot-release';
import { otherRealSale, reverseRewards } from './void-reward-reversals';

type Transaction = Prisma.TransactionClient;

export type VoidContext = {
  paymentId: string;
  clientId: string;
  subscriptionId: string;
  /** The voided Subscription's last day before the void. */
  previousEndsOn: Date;
  actor: AuditActor;
  now: Date;
};

type VoidAuditRecord = {
  actionCode: string;
  targetType: string;
  targetId: string;
  metadata: Prisma.InputJsonObject;
};

export type VoidAudit = (record: VoidAuditRecord) => Promise<unknown>;

const audit = (
  transaction: Transaction,
  context: VoidContext,
  record: VoidAuditRecord,
) =>
  transaction.auditRecord.create({
    data: {
      actionCode: record.actionCode,
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.ACCOUNT,
      actorAccountId: context.actor.accountId,
      actorRole: context.actor.role,
      impersonationId: context.actor.impersonationId,
      targetType: record.targetType,
      targetId: record.targetId,
      correlationId: context.paymentId,
      occurredAt: context.now,
      metadata: { ...record.metadata, paymentId: context.paymentId },
    },
  });

// The founder place this sale granted becomes free again; one granted by an
// earlier sale stays. When another real sale of hers remains (a sale
// recorded twice), the place now names that sale (owner decision 3).
const releaseFounderPlace = async (
  transaction: Transaction,
  context: VoidContext,
  other: { id: string } | null,
) => {
  const place = await transaction.founderMembership.findFirst({
    where: { paymentId: context.paymentId, deletedAt: null },
    select: { id: true, number: true },
  });
  if (place === null) return;
  await transaction.founderMembership.update({
    where: { id: place.id },
    data: other === null ? { deletedAt: context.now } : { paymentId: other.id },
  });
  await audit(transaction, context, {
    actionCode:
      other === null
        ? 'founder_membership.released'
        : 'founder_membership.repointed',
    targetType: 'founder_membership',
    targetId: place.id,
    metadata: {
      clientId: context.clientId,
      number: place.number,
      ...(other === null ? {} : { remainingPaymentId: other.id }),
    },
  });
};

// The Evaluations the voided Plan included and that are still ahead; one
// already held keeps its Bs 50, as Attendance already taken stays.
const cancelIncludedEvaluations = async (
  transaction: Transaction,
  context: VoidContext,
) => {
  const ahead = await transaction.evaluation.findMany({
    where: {
      subscriptionId: context.subscriptionId,
      paymentId: null,
      state: EvaluationState.BOOKED,
      slot: { startsAt: { gt: context.now } },
    },
    select: { id: true, evaluationSlotId: true },
  });
  for (const evaluation of ahead) {
    await transaction.evaluation.update({
      where: { id: evaluation.id },
      data: {
        state: EvaluationState.CANCELLED,
        cancelledAt: context.now,
        cancelledByAccountId: context.actor.accountId,
        cancellationCause: EvaluationCancellationCause.PAYMENT_VOIDED,
      },
    });
    // As a Staff cancellation does: a slot past its block's end is withdrawn.
    await releaseSlot(transaction, evaluation.evaluationSlotId, context.now);
    await audit(transaction, context, {
      actionCode: 'evaluation.cancelled_by_void',
      targetType: 'evaluation',
      targetId: evaluation.id,
      metadata: {
        clientId: context.clientId,
        evaluationSlotId: evaluation.evaluationSlotId,
      },
    });
  }
};

// Her open waitlist entries for the days the voided Plan covered, unless
// another Plan in force covers that day.
const closeWaitlistEntries = async (
  transaction: Transaction,
  context: VoidContext,
) => {
  const coveredUntil = boliviaInstant(
    addCivilDays(context.previousEndsOn, 1),
    0,
  );
  const open = await transaction.waitlistEntry.findMany({
    where: {
      clientId: context.clientId,
      closedAt: null,
      session: { startsAt: { gt: context.now, lt: coveredUntil } },
    },
    select: {
      id: true,
      sessionId: true,
      session: { select: { startsAt: true } },
    },
  });
  for (const entry of open) {
    const day = boliviaDate(entry.session.startsAt);
    const other = await transaction.subscription.findFirst({
      where: {
        clientId: context.clientId,
        id: { not: context.subscriptionId },
        state: SubscriptionState.ACTIVE,
        endedByVoid: false,
        startsOn: { lte: day },
        endsOn: { gte: day },
      },
      select: { id: true },
    });
    if (other !== null) continue;
    await transaction.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        closedAt: context.now,
        closureReason: WaitlistClosureReason.PAYMENT_VOIDED,
        closedByAccountId: context.actor.accountId,
      },
    });
    await audit(transaction, context, {
      actionCode: 'waitlist_entry.closed_by_void',
      targetType: 'waitlist_entry',
      targetId: entry.id,
      metadata: { clientId: context.clientId, sessionId: entry.sessionId },
    });
  }
};

// Owner decision 3 (2026-10-28): a void undoes everything that came from that
// sale, in the void's transaction, each reversal audited.
export const reverseWhatTheSaleGranted = async (
  transaction: Transaction,
  context: VoidContext,
): Promise<void> => {
  const other = await otherRealSale(transaction, context);
  await releaseFounderPlace(transaction, context, other);
  await reverseRewards(
    transaction,
    context,
    (record) => audit(transaction, context, record),
    other,
  );
  await cancelIncludedEvaluations(transaction, context);
  await closeWaitlistEntries(transaction, context);
};
