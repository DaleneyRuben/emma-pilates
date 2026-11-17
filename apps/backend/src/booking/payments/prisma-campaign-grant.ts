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

// An active Client: neither she nor her Account is closed, removed, or
// disabled. Closing an Account removes the Client too.
const withAccount = {
  deletedAt: null,
  account: { is: { deletedAt: null, disabledAt: null } },
};

// FIX-064 (walkthrough finding 90): every active Client, founders included,
// whatever her Plan or price. Her current Subscription takes the classes:
// ACTIVE, its range covering today in America/La_Paz, the most recently
// activated if two overlap. Without one, a Plan already activated to start
// later takes them, the earliest first. A Guest Pass is not her Plan, so the
// classes never land on one. Subscription has no deleted_at.
const liveOrNextOn = (today: Date): Prisma.SubscriptionWhereInput => ({
  state: 'ACTIVE',
  endsOn: { gte: today },
  guestPasses: { none: { deletedAt: null } },
});

const chosen = (
  today: Date,
  subscriptions: readonly {
    id: string;
    startsOn: Date;
    activatedAt: Date | null;
  }[],
): string | undefined => {
  const current = subscriptions
    .filter((subscription) => subscription.startsOn <= today)
    .sort(
      (a, b) =>
        (b.activatedAt?.getTime() ?? 0) - (a.activatedAt?.getTime() ?? 0) ||
        b.id.localeCompare(a.id),
    );
  if (current.length > 0) return current[0].id;
  return [...subscriptions].sort(
    (a, b) =>
      a.startsOn.getTime() - b.startsOn.getTime() || a.id.localeCompare(b.id),
  )[0]?.id;
};

const findRecipients = async (
  transaction: Transaction,
  today: Date,
): Promise<LiveRecipient[]> => {
  const rows = await transaction.client.findMany({
    where: { ...withAccount, subscriptions: { some: liveOrNextOn(today) } },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      subscriptions: {
        where: liveOrNextOn(today),
        select: { id: true, startsOn: true, activatedAt: true },
      },
    },
  });
  return rows.flatMap((row) => {
    const subscriptionId = chosen(today, row.subscriptions);
    if (subscriptionId === undefined) return [];
    return [{ clientId: row.id, name: row.name, subscriptionId }];
  });
};

// Every other active Client: her next Subscription collects the classes.
const findWithoutPlan = async (
  transaction: Transaction,
  today: Date,
): Promise<CampaignRecipient[]> =>
  transaction.client
    .findMany({
      where: { ...withAccount, subscriptions: { none: liveOrNextOn(today) } },
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
          where: {
            ...withAccount,
            subscriptions: { some: liveOrNextOn(today) },
          },
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
        // One write or two per active Client: more than the default 5 s.
        timeoutMilliseconds: 60_000,
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
