import type { PrismaClient } from '../../generated/prisma/client';
import { createPrismaPaymentCommands } from './prisma-payment-commands';

export const createPurchaseIntentExpiryJob = (
  prisma: PrismaClient,
  now: () => Date,
  referralRewardCentavos: number,
) => {
  const commands = createPrismaPaymentCommands(prisma, {
    now,
    referralRewardCentavos,
  });

  return {
    execute: async (): Promise<{ expired: number }> => ({
      expired: await commands.expirePurchaseIntents(),
    }),
  };
};
