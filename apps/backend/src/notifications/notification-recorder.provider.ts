import type { Provider } from '@nestjs/common';
import type { PgBoss } from 'pg-boss';
import { PG_BOSS } from '../database/database.module';
import { createNotificationRecorder } from './prisma-notification-store';

// The recorder every production command uses, so each inbox entry also queues
// its push (NOT-002).
export const NOTIFICATION_RECORDER = Symbol('NOTIFICATION_RECORDER');

export const notificationRecorderProvider: Provider = {
  provide: NOTIFICATION_RECORDER,
  inject: [PG_BOSS],
  useFactory: (boss: PgBoss) => createNotificationRecorder(boss),
};
