import {
  StaffRole,
  type Prisma,
  type PrismaClient,
} from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';
import { materializationHorizon } from '../materialization-horizon';
import { plannedSessions } from './session-materialization';

export type SessionMaterialization = {
  schedules: number;
  created: number;
  skipped: number;
};

const minutesOf = (wallClock: Date): number =>
  wallClock.getUTCHours() * 60 + wallClock.getUTCMinutes();

export type MaterializableSchedule = {
  id: string;
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  weekday: number;
  startsAtLocal: Date;
  capacity: number;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  classType: { durationMinutes: number };
};

// Inserts one schedule's missing occurrences across the horizon. ON CONFLICT
// DO NOTHING without a target: the unique schedule/occurrence index makes
// reruns and concurrent runs no-ops, and the Branch and Trainer exclusion
// constraints skip an occurrence that would overlap a scheduled Session.
export const materializeSchedule = async (
  client: PrismaClient | Prisma.TransactionClient,
  schedule: MaterializableSchedule,
  clock: { today: Date; now: Date },
): Promise<{ created: number; skipped: number }> => {
  const planned = plannedSessions(
    {
      weekday: schedule.weekday,
      startMinutes: minutesOf(schedule.startsAtLocal),
      durationMinutes: schedule.classType.durationMinutes,
      effectiveFrom: schedule.effectiveFrom,
      effectiveUntil: schedule.effectiveUntil,
    },
    clock,
  );
  if (planned.length === 0) return { created: 0, skipped: 0 };

  const { count } = await client.session.createMany({
    data: planned.map((session) => ({
      sessionScheduleId: schedule.id,
      branchId: schedule.branchId,
      classTypeId: schedule.classTypeId,
      trainerStaffMemberId: schedule.trainerStaffMemberId,
      startsAt: session.startsAt,
      occurrenceStartsAt: session.startsAt,
      endsAt: session.endsAt,
      capacity: schedule.capacity,
      createdAt: clock.now,
    })),
    skipDuplicates: true,
  });
  return { created: count, skipped: planned.length - count };
};

export const createPrismaSessionMaterializer = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  // Hourly reconciler (ADR-0058/0059): extends every eligible Session Schedule
  // to the current horizon. It only inserts, so Sessions already materialized,
  // booked, or cancelled are never rewritten.
  const materializeSessions = async (): Promise<SessionMaterialization> => {
    const now = dependencies.now();
    const today = boliviaDate(now);
    const horizon = materializationHorizon(today);
    const candidates = await prisma.sessionSchedule.findMany({
      where: {
        effectiveFrom: { lte: horizon.through },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: today } }],
        branch: { archivedAt: null },
        classType: { archivedAt: null },
        trainer: { role: StaffRole.TRAINER },
      },
      // The older schedule wins when two overlap on a newly reached date.
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        branchId: true,
        classTypeId: true,
        trainerStaffMemberId: true,
        weekday: true,
        startsAtLocal: true,
        capacity: true,
        effectiveFrom: true,
        effectiveUntil: true,
        classType: { select: { durationMinutes: true } },
        trainer: {
          select: {
            branchAssignments: {
              where: { deletedAt: null },
              select: { branchId: true },
            },
          },
        },
      },
    });
    // BKM-001: a schedule's Trainer must be assigned to its Branch.
    const schedules = candidates.filter((schedule) =>
      schedule.trainer.branchAssignments.some(
        ({ branchId }) => branchId === schedule.branchId,
      ),
    );
    let created = 0;
    let skipped = 0;

    for (const schedule of schedules) {
      const result = await materializeSchedule(prisma, schedule, {
        today,
        now,
      });
      created += result.created;
      skipped += result.skipped;
    }

    return { schedules: schedules.length, created, skipped };
  };

  return { materializeSessions };
};
