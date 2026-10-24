import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import { NOTIFICATION_RECORDER } from '../../notifications/notification-recorder.provider';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import {
  courtesyAccessGrant,
  type CourtesyAccessGrant,
} from './courtesy-access.controller';
import { createPrismaCourtesyAccess } from './prisma-courtesy-access';

export const courtesyAccessProvider = (prismaToken: symbol): Provider => ({
  provide: courtesyAccessGrant,
  inject: [prismaToken, NOTIFICATION_RECORDER],
  useFactory: (
    prisma: PrismaClient,
    recordNotification: NotificationRecorder,
  ): CourtesyAccessGrant =>
    createPrismaCourtesyAccess(prisma, {
      now: () => new Date(),
      recordNotification,
    }).grant,
});
