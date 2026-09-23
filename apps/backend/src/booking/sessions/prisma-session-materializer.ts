import { StaffRole, type PrismaClient } from '../../generated/prisma/client';
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
          select: { branchAssignments: { select: { branchId: true } } },
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
      const planned = plannedSessions(
        {
          weekday: schedule.weekday,
          startMinutes: minutesOf(schedule.startsAtLocal),
          durationMinutes: schedule.classType.durationMinutes,
          effectiveFrom: schedule.effectiveFrom,
          effectiveUntil: schedule.effectiveUntil,
        },
        { today, now },
      );
      if (planned.length === 0) continue;

      // ON CONFLICT DO NOTHING without a target: the unique schedule/start
      // index makes reruns and concurrent runs no-ops, and the Branch and
      // Trainer exclusion constraints skip an occurrence that would overlap a
      // scheduled Session.
      const { count } = await prisma.session.createMany({
        data: planned.map((session) => ({
          sessionScheduleId: schedule.id,
          branchId: schedule.branchId,
          classTypeId: schedule.classTypeId,
          trainerStaffMemberId: schedule.trainerStaffMemberId,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          capacity: schedule.capacity,
          createdAt: now,
        })),
        skipDuplicates: true,
      });
      created += count;
      skipped += planned.length - count;
    }

    return { schedules: schedules.length, created, skipped };
  };

  return { materializeSessions };
};
