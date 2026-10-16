import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import {
  AdministrationError,
  requireAdministrator,
} from './administration-errors';
import { findRowClash, type ScheduleRow } from './schedule-rows';
import {
  createAndMaterialize,
  requireAssignable,
  scheduleTransaction,
} from './schedule-writes';

export type ScheduleBatchInput = {
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  capacity: number;
  effectiveFrom: Date;
  rows: ScheduleRow[];
};

// WEB-025 (approved 2026-10-16): several weekly rows of one Class Type,
// Trainer, capacity, and «Vigente desde» are created and materialized in one
// transaction or not at all. Occurrences that clash with an existing Session
// are still skipped per row, as a single create skips them (ADR-0059).
export const createPrismaScheduleBatch = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  const transact = scheduleTransaction(prisma);

  return {
    createSchedules: async (
      input: ScheduleBatchInput,
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const now = dependencies.now();
      if (input.effectiveFrom < boliviaDate(now)) {
        throw new AdministrationError('effective_date_invalid');
      }
      return transact(async (transaction) => {
        await requireAssignable(transaction, input);
        const clash = findRowClash(input.rows);
        if (clash !== null) {
          throw new AdministrationError(
            'schedule_rows_overlap',
            `Row ${clash.row} ${clash.kind === 'repeated' ? 'repeats' : 'overlaps'} row ${clash.clashesWith}`,
          );
        }
        const schedules = [];
        for (const row of input.rows) {
          schedules.push(
            await createAndMaterialize(
              transaction,
              {
                branchId: input.branchId,
                classTypeId: input.classTypeId,
                trainerStaffMemberId: input.trainerStaffMemberId,
                capacity: input.capacity,
                weekday: row.weekday,
                startsAtLocal: row.startsAtLocal,
                durationMinutes: row.durationMinutes,
                effectiveFrom: input.effectiveFrom,
                effectiveUntil: null,
              },
              now,
            ),
          );
        }
        return { schedules };
      });
    },
  };
};

export type ScheduleBatch = ReturnType<typeof createPrismaScheduleBatch>;
