import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  StaffRole,
} from '../../generated/prisma/enums';
import { boliviaDate } from '../../time/bolivia-time';
import { accountStatus } from '../assistant/prisma-assistant-client-repository';
import { closureScope } from '../account-closure/closure-scope';
import { createCatalogRepository } from '../catalog/prisma-catalog-repository';
import { toSubscriptionSummary } from '../client/client-subscription';
import { containsPattern } from '../search-pattern';
import type {
  AdministratorClientDirectory,
  AdministratorClientRow,
} from './administrator-clients';

const accountSelect = {
  select: {
    email: true,
    activatedAt: true,
    emailVerifiedAt: true,
    disabledAt: true,
  },
} as const;

// The same "active" as the Client's own Mi plan: an ACTIVE Subscription whose
// Bolivia date range includes today.
const activeOn = (today: Date) =>
  ({
    state: 'ACTIVE',
    startsOn: { lte: today },
    endsOn: { gte: today },
  }) satisfies Prisma.SubscriptionWhereInput;

// Clients without an Account are unreachable for the studio and stay hidden,
// as in the Assistant search.
const withAccount = {
  deletedAt: null,
  account: { isNot: null },
} satisfies Prisma.ClientWhereInput;

// STAFF-004's accent- and case-insensitive match on name and email (the name
// uses the trigram index), phone as typed.
const searchCondition = (query: string | undefined): Prisma.Sql => {
  if (query === undefined) return Prisma.empty;
  const pattern = containsPattern(query);
  return Prisma.sql`AND (booking.search_text(c.name) LIKE booking.search_text(${pattern})
    OR booking.search_text(a.email) LIKE booking.search_text(${pattern})
    OR c.phone ILIKE ${pattern})`;
};

// WEB-004: the Administrator's studio-wide directory (AW21) and one Client's
// summary (AW22), read page by page (ADR-0061) with search as its only
// filter (ADR-0062).
export const createPrismaAdministratorClients = (
  prisma: PrismaClient,
): AdministratorClientDirectory => {
  const catalog = createCatalogRepository(prisma);

  const directory: AdministratorClientDirectory = {
    list: async ({ page, pageSize, query, today }) => {
      const search = searchCondition(query);
      const [matches, [counted], studioClientCount, activePlanClientCount] =
        await Promise.all([
          prisma.$queryRaw<{ id: string }[]>`
            SELECT c.id
            FROM booking.clients c
            JOIN system.accounts a ON a.client_id = c.id
            WHERE c.deleted_at IS NULL ${search}
            ORDER BY c.name, c.id
            LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
          prisma.$queryRaw<{ total: bigint }[]>`
            SELECT count(*) AS total
            FROM booking.clients c
            JOIN system.accounts a ON a.client_id = c.id
            WHERE c.deleted_at IS NULL ${search}`,
          prisma.client.count({ where: withAccount }),
          prisma.client.count({
            where: { ...withAccount, subscriptions: { some: activeOn(today) } },
          }),
        ]);
      const rows = await prisma.client.findMany({
        where: { id: { in: matches.map(({ id }) => id) } },
        select: {
          id: true,
          name: true,
          phone: true,
          account: accountSelect,
          subscriptions: {
            where: activeOn(today),
            select: { planNameSnapshot: true },
            take: 1,
          },
          _count: { select: { subscriptions: true } },
        },
      });
      const byId = new Map(
        rows.flatMap((row): [string, AdministratorClientRow][] => {
          if (row.account === null) return [];
          const active = row.subscriptions[0];
          return [
            [
              row.id,
              {
                id: row.id,
                name: row.name,
                email: row.account.email,
                phone: row.phone,
                accountStatus: accountStatus(row.account),
                planName: active?.planNameSnapshot ?? null,
                subscriptionStatus:
                  active !== undefined
                    ? 'active'
                    : row._count.subscriptions > 0
                      ? 'expired'
                      : 'none',
              },
            ],
          ];
        }),
      );
      return {
        items: matches.flatMap(({ id }) => byId.get(id) ?? []),
        page,
        pageSize,
        totalItems: Number(counted?.total ?? 0),
        studioClientCount,
        activePlanClientCount,
      };
    },

    read: async (clientId) => {
      const row = await prisma.client.findFirst({
        where: { id: clientId, deletedAt: null },
        select: {
          id: true,
          name: true,
          phone: true,
          referralCode: true,
          createdAt: true,
          account: accountSelect,
          _count: { select: { referralsMade: true } },
        },
      });
      if (row === null || row.account === null) return null;
      return {
        id: row.id,
        name: row.name,
        email: row.account.email,
        phone: row.phone,
        accountStatus: accountStatus(row.account),
        clientSince: boliviaDate(row.createdAt),
        referralCode: row.referralCode,
        referredClientCount: row._count.referralsMade,
      };
    },

    findActiveSubscription: (clientId, onDate) =>
      catalog
        .findActiveSubscription(clientId, onDate)
        .then(toSubscriptionSummary),
    findLatestSubscription: (clientId) =>
      catalog.findLatestSubscription(clientId).then(toSubscriptionSummary),
    readClosureOutlook: async (clientId, now) => {
      const [bookings, waitlist, evaluations, pending] = await Promise.all([
        prisma.booking.count({
          where: closureScope.futureBookings(clientId, now),
        }),
        prisma.waitlistEntry.count({
          where: closureScope.activeWaitlistEntries(clientId),
        }),
        prisma.evaluation.count({
          where: closureScope.upcomingEvaluations(clientId, now),
        }),
        prisma.payment.count({ where: closureScope.pendingPayments(clientId) }),
      ]);
      return {
        futureBookingCount: bookings,
        activeWaitlistEntryCount: waitlist,
        upcomingEvaluationCount: evaluations,
        transferPaymentPending: pending > 0,
      };
    },

    // The audit names which fields changed, never their values (ADR-0055).
    saveProfile: async (input) => {
      const changedFields = [
        ...(input.previous.name === input.name ? [] : ['name']),
        ...(input.previous.phone === input.phone ? [] : ['phone']),
      ];
      await prisma.$transaction(async (transaction) => {
        await transaction.client.update({
          where: { id: input.clientId },
          data: { name: input.name, phone: input.phone },
        });
        await transaction.auditRecord.create({
          data: {
            actionCode: 'client.profile_corrected',
            outcome: AuditOutcome.SUCCEEDED,
            actorKind: AuditActorKind.ACCOUNT,
            actorAccountId: input.actorAccountId,
            actorRole:
              input.actorRole === 'coordinator'
                ? StaffRole.COORDINATOR
                : StaffRole.ADMINISTRATOR,
            targetType: 'client',
            targetId: input.clientId,
            correlationId: randomUUID(),
            occurredAt: input.occurredAt,
            metadata: { changedFields },
          },
        });
      });
      const saved = await directory.read(input.clientId);
      if (saved === null) throw new Error('Client vanished after its update');
      return saved;
    },
  };
  return directory;
};
