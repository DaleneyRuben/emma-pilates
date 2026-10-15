import type { PrismaClient } from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import { createPrismaPaymentCommands } from './prisma-payment-commands';

export const createPurchaseIntentExpiryJob = (
  prisma: PrismaClient,
  now: () => Date,
  referralRewardCentavos: number,
  recordNotification?: NotificationRecorder,
) => {
  const commands = createPrismaPaymentCommands(prisma, {
    now,
    referralRewardCentavos,
    recordNotification,
  });

  return {
    execute: async (): Promise<{ expired: number }> => ({
      expired: await commands.expirePurchaseIntents(),
    }),
  };
};
