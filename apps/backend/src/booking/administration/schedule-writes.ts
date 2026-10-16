import { retrySerializable } from '../../database/retry-serializable';
import { StaffRole } from '../../generated/prisma/enums';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';
import { materializeSchedule } from '../sessions/prisma-session-materializer';
import { AdministrationError, databaseCause } from './administration-errors';

type Transaction = Prisma.TransactionClient;

// The schedule writes the single and the batch create share (WEB-025).
export type ScheduleInput = {
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  weekday: number;
  startsAtLocal: string;
  capacity: number;
};

const serializable = { isolationLevel: 'Serializable' } as const;

export const scheduleSelect = {
  id: true,
  branchId: true,
  classTypeId: true,
  trainerStaffMemberId: true,
  weekday: true,
  startsAtLocal: true,
  capacity: true,
  effectiveFrom: true,
  effectiveUntil: true,
  classType: { select: { durationMinutes: true, name: true } },
} satisfies Prisma.SessionScheduleSelect;

const wallClock = (localTime: string): Date => {
  const match = /^(\d{2}):(\d{2})$/.exec(localTime);
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  if (match === null || hours > 23 || minutes > 59) {
    throw new AdministrationError('invalid_schedule');
  }
  return new Date(Date.UTC(1970, 0, 1, hours, minutes));
};

// Overlaps with another scheduled Session surface as exclusion violations.
const translate = (error: unknown): never => {
  const cause = databaseCause(error);
  if (
    cause.includes('sessions_branch_no_overlap') ||
    cause.includes('sessions_trainer_no_overlap')
  ) {
    throw new AdministrationError('session_overlap');
  }
  if (cause.includes('violates check constraint')) {
    throw new AdministrationError('invalid_schedule');
  }
  throw error;
};

export const scheduleTransaction =
  (prisma: PrismaClient) =>
  <Result>(
    work: (transaction: Transaction) => Promise<Result>,
  ): Promise<Result> =>
    retrySerializable(() => prisma.$transaction(work, serializable)).catch(
      translate,
    );

// BKM-001: an active Branch and Class Type, and a Trainer assigned there.
export const requireAssignable = async (
  transaction: Transaction,
  input: {
    branchId: string;
    classTypeId: string;
    trainerStaffMemberId: string;
  },
) => {
  const [branch, classType, trainer] = await Promise.all([
    transaction.branch.findUnique({
      where: { id: input.branchId },
      select: { archivedAt: true },
    }),
    transaction.classType.findUnique({
      where: { id: input.classTypeId },
      select: { archivedAt: true, durationMinutes: true, name: true },
    }),
    transaction.staffMember.findUnique({
      where: { id: input.trainerStaffMemberId },
      select: {
        role: true,
        account: { select: { disabledAt: true } },
        branchAssignments: {
          where: { branchId: input.branchId, deletedAt: null },
          select: { branchId: true },
        },
      },
    }),
  ]);
  if (branch === null || branch.archivedAt !== null) {
    throw new AdministrationError('branch_not_found');
  }
  if (classType === null || classType.archivedAt !== null) {
    throw new AdministrationError('class_type_not_found');
  }
  if (
    trainer === null ||
    trainer.role !== StaffRole.TRAINER ||
    trainer.account?.disabledAt != null ||
    trainer.branchAssignments.length === 0
  ) {
    throw new AdministrationError('trainer_not_assignable');
  }
  return classType;
};

export const createAndMaterialize = async (
  transaction: Transaction,
  input: ScheduleInput & { effectiveFrom: Date; effectiveUntil: Date | null },
  now: Date,
) => {
  const schedule = await transaction.sessionSchedule.create({
    data: {
      branchId: input.branchId,
      classTypeId: input.classTypeId,
      trainerStaffMemberId: input.trainerStaffMemberId,
      weekday: input.weekday,
      startsAtLocal: wallClock(input.startsAtLocal),
      capacity: input.capacity,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil,
    },
    select: scheduleSelect,
  });
  const counts = await materializeSchedule(transaction, schedule, {
    today: boliviaDate(now),
    now,
  });
  return { schedule, ...counts };
};
