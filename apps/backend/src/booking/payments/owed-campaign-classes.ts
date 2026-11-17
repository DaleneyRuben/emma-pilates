import type { Prisma } from '../../generated/prisma/client';
import { recordAllowanceAdjustment } from './allowance-adjustments';
import type { AdjustmentAuthor } from './allowance-adjustments';

type Transaction = Prisma.TransactionClient;

// FIX-064 (booking ADR-0014): a campaign's classes for an active Client with
// no current Subscription wait here for her next one.
export const oweCampaignClasses = async (
  transaction: Transaction,
  input: {
    clientId: string;
    classes: number;
    campaignName: string;
    authorAccountId: string;
    correlationId: string;
    now: Date;
  },
): Promise<void> => {
  await transaction.owedCampaignClass.create({
    data: {
      clientId: input.clientId,
      classes: input.classes,
      campaignName: input.campaignName,
      authorAccountId: input.authorAccountId,
      correlationId: input.correlationId,
      createdAt: input.now,
    },
  });
};

// Collected by the next Subscription she activates, the same way an owed
// invite reward is (collectOwedInviteReward): every owed campaign, oldest
// first, each as its own `campaign` adjustment with the campaign's name.
// Never onto a Guest Pass, which she cannot keep.
export const collectOwedCampaignClasses = async (
  transaction: Transaction,
  input: {
    clientId: string;
    subscriptionId: string;
    author: AdjustmentAuthor;
    now: Date;
    correlationId: string;
  },
): Promise<void> => {
  const owed = await transaction.owedCampaignClass.findMany({
    where: { clientId: input.clientId, collectedAt: null, deletedAt: null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, classes: true, campaignName: true },
  });
  if (owed.length === 0) return;
  const landsOnGuestPass = await transaction.guestPass.findFirst({
    where: { courtesySubscriptionId: input.subscriptionId, deletedAt: null },
    select: { id: true },
  });
  if (landsOnGuestPass !== null) return;
  for (const row of owed) {
    const adjustment = await recordAllowanceAdjustment(transaction, {
      subscriptionId: input.subscriptionId,
      clientId: input.clientId,
      classes: row.classes,
      reason: 'campaign',
      author: input.author,
      now: input.now,
      correlationId: input.correlationId,
      campaignName: row.campaignName,
    });
    await transaction.owedCampaignClass.updateMany({
      where: { id: row.id, collectedAt: null, deletedAt: null },
      data: { allowanceAdjustmentId: adjustment.id, collectedAt: input.now },
    });
  }
};
