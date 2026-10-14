import type { PrismaClient } from '../../generated/prisma/client';
import type { CheckPushReceiptsDependencies } from './check-push-receipts';

type PushReceipts = Omit<CheckPushReceiptsDependencies, 'getReceipts' | 'now'>;

const notImplemented = (): Promise<never> =>
  Promise.reject(new Error('not implemented'));

export const createPrismaPushReceipts = (
  prisma: PrismaClient,
): PushReceipts => ({
  discardUnconfirmed: () =>
    Promise.reject(new Error(`not implemented ${typeof prisma}`)),
  findSubmitted: notImplemented,
  recordReceipts: notImplemented,
});
