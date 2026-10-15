import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import { NOTIFICATION_RECORDER } from '../../notifications/notification-recorder.provider';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import {
  AccountClosureController,
  accountClosureOperations,
} from './account-closure.controller';
import { createPrismaAccountClosure } from './prisma-account-closure';

// Kept out of booking.module.ts, which already exceeds the file-size limit.
export const accountClosure = {
  controllers: [AccountClosureController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: accountClosureOperations,
      inject: [prismaToken, NOTIFICATION_RECORDER],
      useFactory: (
        prisma: PrismaClient,
        recordNotification: NotificationRecorder,
      ) =>
        createPrismaAccountClosure(prisma, {
          now: () => new Date(),
          recordNotification,
        }),
    },
  ],
};
