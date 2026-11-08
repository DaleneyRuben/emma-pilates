import type { PrismaClient } from '../../generated/prisma/client';
import { loadQueuedRenewalStart } from '../payments/freeze-window';
import type { ClientFreezeSummary } from './client-subscription';

const civil = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Mi plan's Freeze facts (walkthrough finding 51): the latest Freeze of the
 * plan (after a refusal or a withdrawal she may ask again), the plan's
 * length, and the start of a next plan already queued, which caps the days.
 */
export const clientSubscriptionFreezeReads = (prisma: PrismaClient) => ({
  readQueuedPlanStart: (clientId: string, after: Date) =>
    loadQueuedRenewalStart(prisma, { clientId, after }).then((start) =>
      start === null ? null : civil(start),
    ),
  readFreeze: (subscriptionId: string): Promise<ClientFreezeSummary | null> =>
    prisma.freeze
      .findFirst({
        where: { subscriptionId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, state: true, startsOn: true, endsOn: true },
      })
      .then((row) =>
        row === null
          ? null
          : {
              id: row.id,
              state: row.state.toLowerCase() as ClientFreezeSummary['state'],
              startsOn: civil(row.startsOn),
              endsOn: civil(row.endsOn),
            },
      ),
  readPlanDurationDays: (subscriptionId: string) =>
    prisma.subscription
      .findUnique({
        where: { id: subscriptionId },
        select: { durationDaysSnapshot: true },
      })
      .then((row) => row?.durationDaysSnapshot ?? null),
});
