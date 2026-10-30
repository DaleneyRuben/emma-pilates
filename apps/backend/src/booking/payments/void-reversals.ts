import type { Prisma } from '../../generated/prisma/client';
import {
  AllowanceAdjustmentReason,
  AuditActorKind,
  AuditOutcome,
  EvaluationCancellationCause,
  EvaluationState,
  PaymentMethod,
  PaymentState,
  SubscriptionState,
  WaitlistClosureReason,
} from '../../generated/prisma/client';
import type { AuditActor } from '../../system-identity/authentication/audit-actor';
import {
  boliviaDate,
  boliviaInstant,
  addCivilDays,
} from '../../time/bolivia-time';
import { netAllowanceClasses } from '../commands/net-allowance';

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

const audit = (
  transaction: Transaction,
  context: VoidContext,
  record: {
    actionCode: string;
    targetType: string;
    targetId: string;
    metadata: Prisma.InputJsonObject;
  },
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
// earlier sale stays (owner decision 3, 2026-10-28).
const releaseFounderPlace = async (
  transaction: Transaction,
  context: VoidContext,
) => {
  const place = await transaction.founderMembership.findFirst({
    where: { paymentId: context.paymentId, deletedAt: null },
    select: { id: true, number: true },
  });
  if (place === null) return;
  await transaction.founderMembership.update({
    where: { id: place.id },
    data: { deletedAt: context.now },
  });
  await audit(transaction, context, {
    actionCode: 'founder_membership.released',
    targetType: 'founder_membership',
    targetId: place.id,
    metadata: { clientId: context.clientId, number: place.number },
  });
};

const unusedOn = async (
  transaction: Transaction,
  subscriptionId: string,
  classes: number,
) => {
  const live = await transaction.allowanceAdjustment.findMany({
    where: { subscriptionId, deletedAt: null },
    select: { classes: true },
  });
  return netAllowanceClasses(live) >= classes;
};

// The gift class and the host's invite reward this sale earned, when their
// Subscription still holds them unspent. Each adjustment names its sale in
// the audit record written with it (correlationId).
const removeUnusedRewards = async (
  transaction: Transaction,
  context: VoidContext,
) => {
  const earned = await transaction.auditRecord.findMany({
    where: {
      actionCode: 'allowance_adjustment.recorded',
      correlationId: context.paymentId,
    },
    select: { targetId: true },
  });
  const adjustments = await transaction.allowanceAdjustment.findMany({
    where: {
      id: { in: earned.flatMap(({ targetId }) => targetId ?? []) },
      deletedAt: null,
      reason: {
        in: [
          AllowanceAdjustmentReason.GIFT_NEW_CLIENT,
          AllowanceAdjustmentReason.INVITE_CONVERTED,
        ],
      },
    },
    select: {
      id: true,
      subscriptionId: true,
      clientId: true,
      classes: true,
      reason: true,
    },
  });
  for (const adjustment of adjustments) {
    if (
      !(await unusedOn(
        transaction,
        adjustment.subscriptionId,
        adjustment.classes,
      ))
    ) {
      continue;
    }
    await transaction.allowanceAdjustment.update({
      where: { id: adjustment.id },
      data: { deletedAt: context.now },
    });
    if (adjustment.reason === AllowanceAdjustmentReason.INVITE_CONVERTED) {
      // The friend's next real Plan may earn the host her class again.
      await transaction.guestPass.updateMany({
        where: {
          friendClientId: context.clientId,
          rewardSubscriptionId: adjustment.subscriptionId,
          deletedAt: null,
        },
        data: { rewardedAt: null, rewardSubscriptionId: null },
      });
    }
    await audit(transaction, context, {
      actionCode: 'allowance_adjustment.removed',
      targetType: 'allowance_adjustment',
      targetId: adjustment.id,
      metadata: {
        clientId: adjustment.clientId,
        subscriptionId: adjustment.subscriptionId,
        classes: adjustment.classes,
        reason: adjustment.reason.toLowerCase(),
      },
    });
  }
  await withdrawOwedReward(transaction, context);
};

// A reward owed to a host with no current Plan came from the friend's first
// real Plan; with that sale voided and no other real one, nothing is owed.
const withdrawOwedReward = async (
  transaction: Transaction,
  context: VoidContext,
) => {
  const owed = await transaction.guestPass.findFirst({
    where: {
      friendClientId: context.clientId,
      rewardOwed: true,
      rewardedAt: null,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (owed === null) return;
  const otherSale = await transaction.payment.findFirst({
    where: {
      clientId: context.clientId,
      id: { not: context.paymentId },
      state: PaymentState.CONFIRMED,
      method: { not: PaymentMethod.COURTESY },
      planPriceCentavos: { gt: 0 },
    },
    select: { id: true },
  });
  if (otherSale !== null) return;
  await transaction.guestPass.update({
    where: { id: owed.id },
    data: { rewardOwed: false },
  });
  await audit(transaction, context, {
    actionCode: 'guest_pass.reward_withdrawn',
    targetType: 'guest_pass',
    targetId: owed.id,
    metadata: { clientId: context.clientId },
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
  await releaseFounderPlace(transaction, context);
  await removeUnusedRewards(transaction, context);
  await cancelIncludedEvaluations(transaction, context);
  await closeWaitlistEntries(transaction, context);
};
