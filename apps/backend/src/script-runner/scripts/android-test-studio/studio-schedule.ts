import { boliviaDate } from '../../../time/bolivia-time';
import { administratorEmail } from './studio-people';
import { actingAdministrator } from './studio-principals';
import type { StudioRun } from './studio-services';

// Every day of the week, one 60-minute class an hour in the morning and the
// evening (owner, 2026-11-19).
export const classStarts = [
  '09:00',
  '10:00',
  '11:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];
const weekdays = [1, 2, 3, 4, 5, 6, 7];
const capacity = 8;
const durationMinutes = 60;

export type ScheduleSlot = {
  weekday: number;
  startsAtLocal: string;
  classType: number;
  trainer: number;
};

// The three Class Types and the two Trainers rotate hour by hour, shifted a
// place each day, so every day and every hour shows all of them over the week.
export const weeklySlots = (): ScheduleSlot[] =>
  weekdays.flatMap((weekday) =>
    classStarts.map((startsAtLocal, index) => ({
      weekday,
      startsAtLocal,
      classType: (index + weekday) % 3,
      trainer: (index + weekday) % 2,
    })),
  );

const clockOf = (time: Date): string => time.toISOString().slice(11, 16);

// Published like «Publicar semana» on the admin web: open-ended weekly series
// from the run's day, created and materialized in one transaction per Class
// Type and Trainer of a day. A slot the Branch already runs is left alone.
export const ensureWeeklySchedule = async (
  run: StudioRun,
  input: {
    branchId: string | null;
    classTypeIds: string[];
    trainerIds: (string | undefined)[];
  },
): Promise<void> => {
  const { prisma, dryRun, log, now } = run.context;
  const today = boliviaDate(now());
  const running =
    input.branchId === null
      ? []
      : await prisma.sessionSchedule.findMany({
          where: {
            branchId: input.branchId,
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: today } }],
          },
          select: { weekday: true, startsAtLocal: true },
        });
  const taken = new Set(
    running.map((row) => `${row.weekday} ${clockOf(row.startsAtLocal)}`),
  );
  const missing = weeklySlots().filter(
    (slot) => !taken.has(`${slot.weekday} ${slot.startsAtLocal}`),
  );
  log('android_test_schedule', {
    create: missing.length,
    existing: weeklySlots().length - missing.length,
  });
  if (missing.length === 0 || dryRun) return;

  const groups = new Map<string, ScheduleSlot[]>();
  for (const slot of missing) {
    const key = `${slot.weekday}:${slot.classType}:${slot.trainer}`;
    groups.set(key, [...(groups.get(key) ?? []), slot]);
  }
  const principal = await actingAdministrator(prisma, administratorEmail);
  for (const rows of groups.values()) {
    const trainerStaffMemberId = input.trainerIds[rows[0].trainer];
    if (input.branchId === null || trainerStaffMemberId === undefined) {
      throw new Error('schedule_prerequisites_missing');
    }
    await run.services.schedule.createSchedules(
      {
        branchId: input.branchId,
        classTypeId: input.classTypeIds[rows[0].classType],
        trainerStaffMemberId,
        capacity,
        effectiveFrom: today,
        effectiveUntil: null,
        rows: rows.map((row) => ({
          weekday: row.weekday,
          startsAtLocal: row.startsAtLocal,
          durationMinutes,
        })),
      },
      principal,
    );
  }
};
