import type { Prisma } from '../../generated/prisma/client';
import { SubscriptionState } from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';
import { recordAllowanceAdjustment } from './allowance-adjustments';
import type { AdjustmentAuthor } from './allowance-adjustments';
import { decideInviteReward } from './guest-pass';

type Transaction = Prisma.TransactionClient;

// BKM-014: when the friend buys her first real Plan, the host gets +1 class
// on her current Subscription, or the class is owed to her next one. A retry
// finds the pass already rewarded and grants nothing more. The Bs 60 credit
// award stays until PAY-005 (#157) removes it.
export const grantInviteReward = async (
  transaction: Transaction,
  input: {
    friendClientId: string;
    author: AdjustmentAuthor;
    now: Date;
    correlationId: string;
  },
): Promise<void> => {
  const pass = await transaction.guestPass.findFirst({
    where: { friendClientId: input.friendClientId, deletedAt: null },
    select: { id: true, hostClientId: true, rewardedAt: true },
  });
  if (pass === null) return;

  const today = boliviaDate(input.now);
  const current = await transaction.subscription.findFirst({
    where: {
      clientId: pass.hostClientId,
      state: SubscriptionState.ACTIVE,
      startsOn: { lte: today },
      endsOn: { gte: today },
    },
    orderBy: [{ endsOn: 'desc' }, { id: 'desc' }],
    select: { id: true },
  });
  const guestPass =
    current === null
      ? null
      : await transaction.guestPass.findFirst({
          where: {
            courtesySubscriptionId: current.id,
            deletedAt: null,
          },
          select: { id: true },
        });
  const decision = decideInviteReward({
    alreadyRewarded: pass.rewardedAt !== null,
    currentSubscriptionId: current?.id ?? null,
    currentSubscriptionIsGuestPass: guestPass !== null,
  });
  if (decision === null) return;
  if (decision.subscriptionId === null) {
    await transaction.guestPass.updateMany({
      where: { id: pass.id, rewardedAt: null, deletedAt: null },
      data: { rewardOwed: true },
    });
    return;
  }

  await recordAllowanceAdjustment(transaction, {
    subscriptionId: decision.subscriptionId,
    clientId: pass.hostClientId,
    classes: 1,
    reason: 'invite_converted',
    author: input.author,
    now: input.now,
    correlationId: input.correlationId,
  });
  await transaction.guestPass.updateMany({
    where: { id: pass.id, rewardedAt: null, deletedAt: null },
    data: {
      rewardSubscriptionId: decision.subscriptionId,
      rewardedAt: input.now,
    },
  });
};

// The class owed when she had no Subscription, collected by the next one she
// activates. One pass at a time, oldest first.
export const collectOwedInviteReward = async (
  transaction: Transaction,
  input: {
    hostClientId: string;
    subscriptionId: string;
    author: AdjustmentAuthor;
    now: Date;
    correlationId: string;
  },
): Promise<void> => {
  const owed = await transaction.guestPass.findFirst({
    where: {
      hostClientId: input.hostClientId,
      rewardOwed: true,
      rewardedAt: null,
      deletedAt: null,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });
  if (owed === null) return;
  await recordAllowanceAdjustment(transaction, {
    subscriptionId: input.subscriptionId,
    clientId: input.hostClientId,
    classes: 1,
    reason: 'invite_converted',
    author: input.author,
    now: input.now,
    correlationId: input.correlationId,
  });
  await transaction.guestPass.updateMany({
    where: { id: owed.id, rewardedAt: null, deletedAt: null },
    data: {
      rewardSubscriptionId: input.subscriptionId,
      rewardedAt: input.now,
      rewardOwed: false,
    },
  });
};
