import type { Prisma } from '../../generated/prisma/client';
import type { CatalogRepository } from './catalog-repository';

export function createCatalogRepository(
  prisma: Prisma.TransactionClient,
): CatalogRepository {
  void prisma;
  return {
    listVisiblePlans: () => Promise.resolve([]),
    findClassType: () => Promise.resolve(null),
    findSessionSchedule: () => Promise.resolve(null),
    listScheduledSessions: () => Promise.resolve([]),
    findActiveSubscription: () => Promise.resolve(null),
    listPublishedPromotions: () => Promise.resolve([]),
  };
}
