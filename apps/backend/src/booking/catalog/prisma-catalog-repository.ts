import type { Prisma } from '../../generated/prisma/client';
import type { CatalogRepository } from './catalog-repository';

export function createCatalogRepository(
  prisma: Prisma.TransactionClient,
): CatalogRepository {
  return {
    listVisiblePlans: () =>
      prisma.plan.findMany({
        where: { hiddenAt: null },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          durationMonths: true,
          classAllowance: true,
          priceCentavos: true,
          displayOrder: true,
        },
      }),
    findClassType: (id) =>
      prisma.classType.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          defaultCapacity: true,
          equipmentNeeds: true,
        },
      }),
    findSessionSchedule: (id) =>
      prisma.sessionSchedule.findUnique({
        where: { id },
        select: {
          id: true,
          branchId: true,
          classTypeId: true,
          trainerStaffMemberId: true,
          weekday: true,
          startsAtLocal: true,
          capacity: true,
          effectiveFrom: true,
          effectiveUntil: true,
        },
      }),
    listScheduledSessions: ({ branchId, from, until, limit }) =>
      prisma.session.findMany({
        where: {
          branchId,
          state: 'SCHEDULED',
          startsAt: { gte: from, lt: until },
        },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take: limit,
        select: {
          id: true,
          branchId: true,
          classTypeId: true,
          trainerStaffMemberId: true,
          startsAt: true,
          endsAt: true,
          capacity: true,
        },
      }),
    findActiveSubscription: (clientId, onDate) =>
      prisma.subscription.findFirst({
        where: {
          clientId,
          state: 'ACTIVE',
          startsOn: { lte: onDate },
          endsOn: { gte: onDate },
        },
        select: {
          id: true,
          planId: true,
          planNameSnapshot: true,
          durationMonthsSnapshot: true,
          originalClassAllowance: true,
          remainingClassAllowance: true,
          startsOn: true,
          endsOn: true,
        },
      }),
    listPublishedPromotions: (onDate) =>
      prisma.promotion.findMany({
        where: {
          publishedAt: { not: null },
          archivedAt: null,
          displayStartsOn: { lte: onDate },
          displayEndsOn: { gte: onDate },
        },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          headline: true,
          description: true,
          imageAssetId: true,
          displayOrder: true,
        },
      }),
  };
}
