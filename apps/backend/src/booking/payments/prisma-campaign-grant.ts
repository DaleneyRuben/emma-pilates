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

type Transaction = Prisma.TransactionClient;

const withAccount = { deletedAt: null, account: { isNot: null } };

// The same live Subscription as the Client directory: ACTIVE, and its date
// range covers today in America/La_Paz. Subscription has no deleted_at.
// A founder, Courtesy Access, a hidden Plan, and a Bs 0 Plan are not a
// campaign (FIX-001). A guest pass is a hidden courtesy Subscription.
const liveOn = (today: Date): Prisma.SubscriptionWhereInput => ({
  state: 'ACTIVE',
  startsOn: { lte: today },
  endsOn: { gte: today },
  plan: { hiddenAt: null, priceCentavos: { gt: 0 } },
  payment: {
    method: { not: 'COURTESY' },
    planPriceCentavos: { gt: 0 },
    plan: { hiddenAt: null, priceCentavos: { gt: 0 } },
  },
});

const findRecipients = async (
  transaction: Transaction,
  today: Date,
): Promise<LiveRecipient[]> => {
  const founders = await transaction.founderMembership.findMany({
    where: { deletedAt: null, status: 'ACTIVE' },
    select: { clientId: true },
  });
  const rows = await transaction.client.findMany({
    where: {
      ...withAccount,
      id: { notIn: founders.map((founder) => founder.clientId) },
      subscriptions: { some: liveOn(today) },
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      subscriptions: {
        where: liveOn(today),
        orderBy: { activatedAt: 'desc' },
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

const findSkipped = async (
  transaction: Transaction,
  today: Date,
): Promise<CampaignRecipient[]> => {
  const recipients = await findRecipients(transaction, today);
  const rows = await transaction.client.findMany({
    where: {
      ...withAccount,
      id: { notIn: recipients.map((recipient) => recipient.clientId) },
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true },
  });
  return rows.map((row) => ({ clientId: row.id, name: row.name }));
};

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
      countRecipients: () =>
        prisma.founderMembership
          .findMany({
            where: { deletedAt: null, status: 'ACTIVE' },
            select: { clientId: true },
          })
          .then((founders) =>
            prisma.client.count({
              where: {
                ...withAccount,
                id: { notIn: founders.map((founder) => founder.clientId) },
                subscriptions: { some: liveOn(today) },
              },
            }),
          ),
      findSkipped: () => findSkipped(prisma, today),
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
          findSkipped: () => findSkipped(transaction, today),
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
        }),
    );
  },
});

export type CampaignGrantCommand = ReturnType<typeof createPrismaCampaignGrant>;
