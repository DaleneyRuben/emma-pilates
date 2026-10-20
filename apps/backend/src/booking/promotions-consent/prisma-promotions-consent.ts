import type { PrismaClient } from '../../generated/prisma/client';
import type { PromotionsConsentStore } from './promotions-consent';

const notBuilt = (...input: unknown[]): Promise<never> =>
  Promise.reject(new Error(`not built: ${input.length}`));

export const createPrismaPromotionsConsent = (
  prisma: PrismaClient,
): PromotionsConsentStore => ({
  findOpen: (clientId) => notBuilt(prisma, clientId),
  give: (input) => notBuilt(input),
  withdraw: (input) => notBuilt(input),
});
