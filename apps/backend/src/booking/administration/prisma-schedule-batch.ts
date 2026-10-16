import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { ScheduleRow } from './schedule-rows';
import type { createAndMaterialize } from './schedule-writes';

export type ScheduleBatchInput = {
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  capacity: number;
  effectiveFrom: Date;
  rows: ScheduleRow[];
};

type Created = Awaited<ReturnType<typeof createAndMaterialize>>;

export const createPrismaScheduleBatch = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => ({
  createSchedules: (
    input: ScheduleBatchInput,
    principal: AuthenticatedPrincipal,
  ): Promise<{ schedules: Created[] }> =>
    Promise.reject(
      new Error(
        `not built: ${input.rows.length} ${principal.accountId} ${String(prisma !== null && dependencies.now !== null)}`,
      ),
    ),
});
