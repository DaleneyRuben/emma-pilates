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

// Marks rows removed (ADR-0086) in short, separate statements so a large
// backlog never holds long locks on tables the API reads and writes on every
// request. Rows already marked are skipped, so a rerun reports nothing.
export const createPrismaRetentionSweeps = (
  prisma: PrismaClient,
  options: { now?: () => Date; batchSize?: number } = {},
) => {
  const now = options.now ?? (() => new Date());
  const batchSize = options.batchSize ?? defaultBatchSize;

  const drain = async (
    removeBatch: (limit: number) => Prisma.PrismaPromise<number>,
  ): Promise<number> => {
    let total = 0;
    for (let batch = 0; batch < maxBatchesPerTable; batch += 1) {
      const removed = await removeBatch(batchSize);
      total += removed;
      if (removed < batchSize) break;
    }
    return total;
  };

  return {
    execute: async (): Promise<RetentionSweepResult> => {
      const sweptAt = now();
      const cutoffs = retentionCutoffs(sweptAt);

      const idempotencyRecords = await drain(
        (limit) => prisma.$executeRaw`
          UPDATE "system"."idempotency_records" SET "deleted_at" = ${sweptAt}
          WHERE "id" IN (
            SELECT "id" FROM "system"."idempotency_records"
            WHERE "deleted_at" IS NULL
              AND ("expires_at" <= ${cutoffs.idempotencyExpiredBy}
              AND "created_at" <= ${cutoffs.idempotencyCreatedBefore})
            LIMIT ${limit}
          )`,
      );
      const authenticationSessions = await drain(
        (limit) => prisma.$executeRaw`
          UPDATE "system"."authentication_sessions" SET "deleted_at" = ${sweptAt}
          WHERE "id" IN (
            SELECT "id" FROM "system"."authentication_sessions"
            WHERE "deleted_at" IS NULL
              AND ("revoked_at" <= ${cutoffs.authenticationSessionUnusableBefore}
              OR "idle_expires_at" <= ${cutoffs.authenticationSessionUnusableBefore}
              OR "absolute_expires_at" <= ${cutoffs.authenticationSessionUnusableBefore})
            LIMIT ${limit}
          )`,
      );
      const throttleEvents = await drain(
        (limit) => prisma.$executeRaw`
          UPDATE "system"."authentication_throttle_events" SET "deleted_at" = ${sweptAt}
          WHERE "id" IN (
            SELECT "id" FROM "system"."authentication_throttle_events"
            WHERE "deleted_at" IS NULL
              AND ("expires_at" <= ${cutoffs.throttleEventExpiredBefore})
            LIMIT ${limit}
          )`,
      );
      // A removed notification keeps its deliveries.
      const notifications = await drain(
        (limit) => prisma.$executeRaw`
          UPDATE "system"."notifications" SET "deleted_at" = ${sweptAt}
          WHERE "id" IN (
            SELECT "id" FROM "system"."notifications"
            WHERE "deleted_at" IS NULL
              AND ("read_at" <= ${cutoffs.notificationReadBefore})
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
