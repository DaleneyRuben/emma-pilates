import type { PrismaClient } from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import { releaseUnreviewedFounderReservations } from './founder-reservation-expiry';
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
    execute: async (): Promise<{
      expired: number;
      foundersReleased: number;
    }> => ({
      expired: await commands.expirePurchaseIntents(),
      foundersReleased: await releaseUnreviewedFounderReservations(
        prisma,
        now(),
      ),
    }),
  };
};
