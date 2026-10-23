import type { PrismaClient } from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import type { FeedbackStore } from './feedback';

const notImplemented = (): Promise<never> =>
  Promise.reject(new Error('not implemented'));

export const createPrismaFeedbackStore = (
  prisma: PrismaClient,
  dependencies: { recordNotification: NotificationRecorder },
): FeedbackStore => {
  void prisma;
  void dependencies;
  return {
    send: notImplemented,
    list: notImplemented,
    listAll: notImplemented,
    recordExport: notImplemented,
    triage: notImplemented,
  };
};
