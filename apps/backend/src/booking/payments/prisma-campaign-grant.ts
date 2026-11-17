import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { runIdempotent } from '../../database/run-idempotent';
import { boliviaDate } from '../../time/bolivia-time';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { recordAllowanceAdjustment } from './allowance-adjustments';
import {
  grantCampaign,
  previewCampaign,
  type CampaignCommand,
  type CampaignGrant,
  type CampaignPreview,
  type CampaignRecipient,
  type LiveRecipient,
} from './grant-campaign';
import { oweCampaignClasses } from './owed-campaign-classes';

type Transaction = Prisma.TransactionClient;

const withAccount = { deletedAt: null, account: { isNot: null } };

// FIX-064 (walkthrough finding 90): every active Client with a current
// Subscription, founders included, whatever its Plan or price: ACTIVE, and
// its date range covers today in America/La_Paz. Subscription has no
// deleted_at. A Guest Pass is not her Plan, so the class never lands on it.
const currentOn = (today: Date): Prisma.SubscriptionWhereInput => ({
  state: 'ACTIVE',
  startsOn: { lte: today },
  endsOn: { gte: today },
  guestPasses: { none: { deletedAt: null } },
});

const findRecipients = async (
  transaction: Transaction,
  today: Date,
): Promise<LiveRecipient[]> => {
  const rows = await transaction.client.findMany({
    where: { ...withAccount, subscriptions: { some: currentOn(today) } },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      subscriptions: {
        where: currentOn(today),
        orderBy: [{ activatedAt: 'desc' }, { id: 'desc' }],
        take: 1,
        select: { id: true },
      },
    },
  });
  return rows.flatMap((row) => {
    const subscription = row.subscriptions[0];
    if (subscription === undefined) return [];
    return [
      { clientId: row.id, name: row.name, subscriptionId: subscription.id },
    ];
  });
};

// Every other active Client: her next Subscription collects the classes.
const findWithoutPlan = async (
  transaction: Transaction,
  today: Date,
): Promise<CampaignRecipient[]> =>
  transaction.client
    .findMany({
      where: { ...withAccount, subscriptions: { none: currentOn(today) } },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
    })
    .then((rows) => rows.map((row) => ({ clientId: row.id, name: row.name })));

export const createPrismaCampaignGrant = (
  prisma: PrismaClient,
  now: () => Date,
) => ({
  preview: async (
    principal: AuthenticatedPrincipal,
  ): Promise<CampaignPreview> => {
    const today = boliviaDate(now());
    return previewCampaign({
      principal,
      countWithPlan: () =>
        prisma.client.count({
          where: { ...withAccount, subscriptions: { some: currentOn(today) } },
        }),
      findWithoutPlan: () => findWithoutPlan(prisma, today),
    });
  },
  grant: async (
    command: CampaignCommand,
    principal: AuthenticatedPrincipal,
  ): Promise<CampaignGrant> => {
    const today = boliviaDate(now());
    return runIdempotent(
      prisma,
      {
        accountId: principal.accountId,
        command: 'grant_campaign',
        idempotencyKey: command.idempotencyKey,
        request: { name: command.name.trim(), classes: command.classes },
        now,
        onKeyReused: () => new Error('idempotency_key_reused'),
      },
      (transaction) =>
        grantCampaign(command, {
          principal,
          now: now(),
          today,
          findRecipients: () => findRecipients(transaction, today),
          findWithoutPlan: () => findWithoutPlan(transaction, today),
          record: (input) =>
            recordAllowanceAdjustment(transaction, {
              subscriptionId: input.subscriptionId,
              clientId: input.clientId,
              classes: input.classes,
              reason: 'campaign',
              author: {
                accountId: input.authorAccountId,
                role: 'ADMINISTRATOR',
              },
              now: input.now,
              correlationId: command.idempotencyKey,
              campaignName: input.campaignName,
            }),
          owe: (input) =>
            oweCampaignClasses(transaction, {
              clientId: input.clientId,
              classes: input.classes,
              campaignName: input.campaignName,
              authorAccountId: input.authorAccountId,
              correlationId: command.idempotencyKey,
              now: input.now,
            }),
        }),
    );
  },
});

export type CampaignGrantCommand = ReturnType<typeof createPrismaCampaignGrant>;
