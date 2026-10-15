import type { PrismaClient } from '../../generated/prisma/client';
import { checkPushReceipts } from './check-push-receipts';
import { dispatchPush } from './dispatch-push';
import { createExpoPushProvider } from './expo-push-provider';
import { createPrismaPushDeliveries } from './prisma-push-deliveries';
import { createPrismaPushReceipts } from './prisma-push-receipts';

// The worker's push composition: Prisma state, Expo delivery, one clock.
export const createPushDeliveryRuntime = (options: {
  prisma: PrismaClient;
  fetch: typeof fetch;
  expoAccessToken: string | null;
  now: () => Date;
}) => {
  const { prisma, now } = options;
  const provider = createExpoPushProvider({
    fetch: options.fetch,
    accessToken: options.expoAccessToken,
  });
  const deliveries = createPrismaPushDeliveries(prisma, now);
  const receipts = createPrismaPushReceipts(prisma);

  return {
    pushDispatch: {
      dispatch: (job: Parameters<typeof dispatchPush>[0]) =>
        dispatchPush(job, {
          ...deliveries,
          send: (messages) => provider.send(messages),
          now,
        }),
    },
    pushReceipts: {
      execute: () =>
        checkPushReceipts({
          ...receipts,
          getReceipts: (ticketIds) => provider.getReceipts(ticketIds),
          now,
        }),
    },
  };
};
