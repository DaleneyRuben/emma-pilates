import type { PrismaClient } from '../../generated/prisma/client';
import type { PromotionContactStore } from './promotion-contacts';

// Red stub: BE-022 builds the PostgreSQL store next.
export const createPrismaPromotionContacts = (
  prisma: PrismaClient,
): PromotionContactStore => {
  const notBuilt = (): Promise<never> =>
    Promise.reject(new Error(`not built (${typeof prisma})`));
  return {
    list: notBuilt,
    listAll: notBuilt,
    recordExport: notBuilt,
    withdraw: notBuilt,
  };
};
