import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { retentionCutoffs } from './retention-policy';

export type RetentionSweepResult = {
  idempotencyRecords: number;
  authenticationSessions: number;
  throttleEvents: number;
  notifications: number;
};

const defaultBatchSize = 1_000;
// Bounds one run; whatever remains is picked up by the next pass.
const maxBatchesPerTable = 50;

// Deletes in short, separate statements so a large backlog never holds long
// locks on tables the API reads and writes on every request.
export const createPrismaRetentionSweeps = (
  prisma: PrismaClient,
  options: { now?: () => Date; batchSize?: number } = {},
) => {
  const now = options.now ?? (() => new Date());
  const batchSize = options.batchSize ?? defaultBatchSize;

  const drain = async (
    deleteBatch: (limit: number) => Prisma.PrismaPromise<number>,
  ): Promise<number> => {
    let total = 0;
    for (let batch = 0; batch < maxBatchesPerTable; batch += 1) {
      const deleted = await deleteBatch(batchSize);
      total += deleted;
      if (deleted < batchSize) break;
    }
    return total;
  };

  return {
    execute: async (): Promise<RetentionSweepResult> => {
      const cutoffs = retentionCutoffs(now());

      const idempotencyRecords = await drain(
        (limit) => prisma.$executeRaw`
          DELETE FROM "system"."idempotency_records"
          WHERE "id" IN (
            SELECT "id" FROM "system"."idempotency_records"
            WHERE "expires_at" <= ${cutoffs.idempotencyExpiredBy}
              AND "created_at" <= ${cutoffs.idempotencyCreatedBefore}
            LIMIT ${limit}
          )`,
      );
      const authenticationSessions = await drain(
        (limit) => prisma.$executeRaw`
          DELETE FROM "system"."authentication_sessions"
          WHERE "id" IN (
            SELECT "id" FROM "system"."authentication_sessions"
            WHERE "revoked_at" <= ${cutoffs.authenticationSessionUnusableBefore}
              OR "idle_expires_at" <= ${cutoffs.authenticationSessionUnusableBefore}
              OR "absolute_expires_at" <= ${cutoffs.authenticationSessionUnusableBefore}
            LIMIT ${limit}
          )`,
      );
      const throttleEvents = await drain(
        (limit) => prisma.$executeRaw`
          DELETE FROM "system"."authentication_throttle_events"
          WHERE "id" IN (
            SELECT "id" FROM "system"."authentication_throttle_events"
            WHERE "expires_at" <= ${cutoffs.throttleEventExpiredBefore}
            LIMIT ${limit}
          )`,
      );
      // Deliveries of a removed notification cascade with it.
      const notifications = await drain(
        (limit) => prisma.$executeRaw`
          DELETE FROM "system"."notifications"
          WHERE "id" IN (
            SELECT "id" FROM "system"."notifications"
            WHERE "read_at" <= ${cutoffs.notificationReadBefore}
            LIMIT ${limit}
          )`,
      );

      return {
        idempotencyRecords,
        authenticationSessions,
        throttleEvents,
        notifications,
      };
    },
  };
};
