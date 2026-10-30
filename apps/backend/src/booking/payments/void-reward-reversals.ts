import type { Prisma } from '../../generated/prisma/client';
import {
  AllowanceAdjustmentReason,
  PaymentKind,
  PaymentMethod,
  PaymentState,
  SubscriptionState,
} from '../../generated/prisma/client';
import { netAllowanceClasses } from '../commands/net-allowance';
import { recordAllowanceAdjustment } from './allowance-adjustments';
import type { VoidAudit, VoidContext } from './void-reversals';

type Transaction = Prisma.TransactionClient;

// Another confirmed real Plan sale of the same Client: a sale recorded twice
// and voided once still leaves her a real buyer.
export const otherRealSale = (transaction: Transaction, context: VoidContext) =>
  transaction.payment.findFirst({
    where: {
      clientId: context.clientId,
      id: { not: context.paymentId },
      kind: PaymentKind.PLAN,
      state: PaymentState.CONFIRMED,
      method: { not: PaymentMethod.COURTESY },
      planPriceCentavos: { gt: 0 },
      plan: { hiddenAt: null },
    },
    orderBy: [{ decidedAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      subscription: { select: { id: true, state: true } },
    },
  });

type OtherSale = Awaited<ReturnType<typeof otherRealSale>>;

// Whether a Subscription still holds `classes` extra classes unspent.
const unspentOn = async (
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

const removeAdjustment = async (
  transaction: Transaction,
  context: VoidContext,
  audit: VoidAudit,
  adjustment: {
    id: string;
    subscriptionId: string;
    clientId: string;
    classes: number;
    reason: AllowanceAdjustmentReason;
  },
) => {
  await transaction.allowanceAdjustment.update({
    where: { id: adjustment.id },
    data: { deletedAt: context.now },
  });
  await audit({
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
};

// The gift class lives on the voided Subscription. Unspent, it is removed;
// when another real sale of hers remains, it moves to that sale's Plan.
const reverseGift = async (
  transaction: Transaction,
  context: VoidContext,
  audit: VoidAudit,
  other: OtherSale,
) => {
  const gifts = await transaction.allowanceAdjustment.findMany({
    where: {
      subscriptionId: context.subscriptionId,
      reason: AllowanceAdjustmentReason.GIFT_NEW_CLIENT,
      deletedAt: null,
    },
    select: {
      id: true,
      subscriptionId: true,
      clientId: true,
      classes: true,
      reason: true,
    },
  });
  for (const gift of gifts) {
    if (!(await unspentOn(transaction, gift.subscriptionId, gift.classes))) {
      continue;
    }
    await removeAdjustment(transaction, context, audit, gift);
    if (other?.subscription?.state !== SubscriptionState.ACTIVE) continue;
    await recordAllowanceAdjustment(transaction, {
      subscriptionId: other.subscription.id,
      clientId: context.clientId,
      classes: gift.classes,
      reason: 'gift_new_client',
      author: { accountId: context.actor.accountId, role: context.actor.role },
      now: context.now,
      correlationId: other.id,
    });
  }
};

// The voided sale was the friend's: the host's reward goes, unless she
// already spent it or the friend still has another real sale.
const reverseFriendReward = async (
  transaction: Transaction,
  context: VoidContext,
  audit: VoidAudit,
  other: OtherSale,
) => {
  if (other !== null) return;
  const pass = await transaction.guestPass.findFirst({
    where: { friendClientId: context.clientId, deletedAt: null },
    select: {
      id: true,
      hostClientId: true,
      rewardOwed: true,
      rewardedAt: true,
      rewardSubscriptionId: true,
    },
  });
  if (pass === null) return;
  if (pass.rewardedAt !== null && pass.rewardSubscriptionId !== null) {
    const reward = await transaction.allowanceAdjustment.findFirst({
      where: {
        subscriptionId: pass.rewardSubscriptionId,
        clientId: pass.hostClientId,
        reason: AllowanceAdjustmentReason.INVITE_CONVERTED,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subscriptionId: true,
        clientId: true,
        classes: true,
        reason: true,
      },
    });
    if (
      reward === null ||
      !(await unspentOn(transaction, reward.subscriptionId, reward.classes))
    ) {
      return;
    }
    await removeAdjustment(transaction, context, audit, reward);
    // The friend's next real Plan may earn the host her class again.
    await transaction.guestPass.update({
      where: { id: pass.id },
      data: { rewardedAt: null, rewardSubscriptionId: null, rewardOwed: false },
    });
    return;
  }
  if (!pass.rewardOwed) return;
  await transaction.guestPass.update({
    where: { id: pass.id },
    data: { rewardOwed: false },
  });
  await audit({
    actionCode: 'guest_pass.reward_withdrawn',
    targetType: 'guest_pass',
    targetId: pass.id,
    metadata: { clientId: context.clientId },
  });
};

// The voided sale was the host's own, and her friend's reward sat on it:
// the friend earned it, so it is owed to the host's next Plan again.
const reowe = async (
  transaction: Transaction,
  context: VoidContext,
  audit: VoidAudit,
) => {
  const passes = await transaction.guestPass.findMany({
    where: {
      hostClientId: context.clientId,
      rewardSubscriptionId: context.subscriptionId,
      deletedAt: null,
    },
    select: { id: true },
  });
  const rewards = await transaction.allowanceAdjustment.findMany({
    where: {
      subscriptionId: context.subscriptionId,
      reason: AllowanceAdjustmentReason.INVITE_CONVERTED,
      deletedAt: null,
    },
    select: {
      id: true,
      subscriptionId: true,
      clientId: true,
      classes: true,
      reason: true,
    },
  });
  for (const [index, pass] of passes.entries()) {
    const reward = rewards[index];
    if (
      reward === undefined ||
      !(await unspentOn(transaction, reward.subscriptionId, reward.classes))
    ) {
      continue;
    }
    await removeAdjustment(transaction, context, audit, reward);
    await transaction.guestPass.update({
      where: { id: pass.id },
      data: { rewardedAt: null, rewardSubscriptionId: null, rewardOwed: true },
    });
    await audit({
      actionCode: 'guest_pass.reward_owed_again',
      targetType: 'guest_pass',
      targetId: pass.id,
      metadata: { clientId: context.clientId },
    });
  }
};

// Owner decision 3: the gift class and the invite reward the sale earned,
// if not yet used.
export const reverseRewards = async (
  transaction: Transaction,
  context: VoidContext,
  audit: VoidAudit,
  other: OtherSale,
): Promise<void> => {
  await reverseGift(transaction, context, audit, other);
  await reverseFriendReward(transaction, context, audit, other);
  await reowe(transaction, context, audit);
};
