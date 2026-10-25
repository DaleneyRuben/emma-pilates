import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../database/database.module';
import type { PrismaClient } from '../../generated/prisma/client';
import { NOTIFICATION_RECORDER } from '../../notifications/notification-recorder.provider';
import { NotificationsModule } from '../../notifications/notifications.module';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import { SystemIdentityModule } from '../system-identity.module';
import {
  exportFeedback,
  listFeedback,
  sendFeedback,
  triageFeedback,
} from './feedback';
import {
  feedbackControllers,
  feedbackOperations,
  type FeedbackOperations,
} from './feedback.controller';
import { createPrismaFeedbackStore } from './prisma-feedback-store';

// REL-012: its own module, because recording the Administrators' push needs
// the Notifications module, which itself imports System Identity.
@Module({
  imports: [SystemIdentityModule, NotificationsModule],
  controllers: [...feedbackControllers],
  providers: [
    {
      provide: feedbackOperations,
      inject: [PRISMA_CLIENT, NOTIFICATION_RECORDER],
      useFactory: (
        prisma: PrismaClient,
        recordNotification: NotificationRecorder,
      ): FeedbackOperations => {
        const dependencies = {
          store: createPrismaFeedbackStore(prisma, { recordNotification }),
          now: () => new Date(),
          newId: randomUUID,
        };
        return {
          send: (command, principal) =>
            sendFeedback(command, principal, dependencies),
          list: (query, principal) =>
            listFeedback(query, principal, dependencies),
          export: (principal) => exportFeedback(principal, dependencies),
          triage: (command, principal) =>
            triageFeedback(command, principal, dependencies),
        };
      },
    },
  ],
})
export class FeedbackModule {}
