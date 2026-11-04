import {
  addCivilDays,
  boliviaInstant,
  isoWeekday,
} from '../../time/bolivia-time';
import { materializationHorizon } from '../materialization-horizon';

export type ScheduleDefinition = {
  weekday: number;
  startMinutes: number;
  durationMinutes: number;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  pausedFrom?: Date | null;
  pausedUntil?: Date | null;
};

// BKM-018: a pause publishes nothing on [pausedFrom, pausedUntil); without
// pausedUntil it lasts until the series is resumed.
const isPaused = (schedule: ScheduleDefinition, date: Date): boolean =>
  schedule.pausedFrom != null &&
  date >= schedule.pausedFrom &&
  (schedule.pausedUntil == null || date < schedule.pausedUntil);

export type PlannedSession = { startsAt: Date; endsAt: Date };

// ADR-0059: every matching Bolivia date of the horizon inside the schedule's
// [effectiveFrom, effectiveUntil) range, skipping occurrences already started.
export const plannedSessions = (
  schedule: ScheduleDefinition,
  clock: { today: Date; now: Date },
): PlannedSession[] => {
  const horizon = materializationHorizon(clock.today);
  const first =
    schedule.effectiveFrom > horizon.from
      ? schedule.effectiveFrom
      : horizon.from;
  const sessions: PlannedSession[] = [];

  for (
    let date = first;
    date <= horizon.through &&
    (schedule.effectiveUntil === null || date < schedule.effectiveUntil);
    date = addCivilDays(date, 1)
  ) {
    if (isoWeekday(date) !== schedule.weekday || isPaused(schedule, date)) {
      continue;
    }

    const startsAt = boliviaInstant(date, schedule.startMinutes);
    if (startsAt <= clock.now) continue;

    sessions.push({
      startsAt,
      endsAt: new Date(startsAt.getTime() + schedule.durationMinutes * 60_000),
    });
  }

  return sessions;
};
