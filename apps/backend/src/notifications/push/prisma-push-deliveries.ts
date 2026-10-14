import type { PrismaClient } from '../../generated/prisma/client';
import type { DispatchPushDependencies } from './dispatch-push';

type PushDeliveries = Omit<DispatchPushDependencies, 'send' | 'now'>;

const notImplemented = (): Promise<never> =>
  Promise.reject(new Error('not implemented'));

export const createPrismaPushDeliveries = (
  prisma: PrismaClient,
  now: () => Date = () => new Date(),
): PushDeliveries => ({
  findNotification: notImplemented,
  prepareDeliveries: notImplemented,
  countUnread: () => notImplemented(),
  recordTickets: () =>
    Promise.reject(
      new Error(`not implemented ${typeof prisma} ${now().toISOString()}`),
    ),
  recordAttempt: notImplemented,
});
