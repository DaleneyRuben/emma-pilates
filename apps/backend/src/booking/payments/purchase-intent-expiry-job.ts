import type { PrismaClient } from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import { createPrismaPaymentCommands } from './prisma-payment-commands';

export const createPurchaseIntentExpiryJob = (
  prisma: PrismaClient,
  now: () => Date,
  recordNotification?: NotificationRecorder,
) => {
  const commands = createPrismaPaymentCommands(prisma, {
    now,
    recordNotification,
  });

  return {
    execute: async (): Promise<{ expired: number }> => ({
      expired: await commands.expirePurchaseIntents(),
    }),
  };
};
