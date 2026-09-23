import {
  addCivilDays,
  boliviaInstant,
  boliviaMonth,
  isoWeekday,
} from '../../time/bolivia-time';
import { materializationHorizon } from '../materialization-horizon';
import { EvaluationRuleError } from './evaluation-errors';

// D1/D2: one global 45-minute slot, cut back-to-back from a start on the
// 15-minute grid. D7: materialized over the shared ADR-0059 horizon.
export const evaluationSlotMinutes = 45;
const gridMinutes = 15;
const minuteMilliseconds = 60 * 1_000;
const hourMilliseconds = 60 * minuteMilliseconds;
// D11: booking and Client cancellation close 3 hours before the start.
const bookingLeadMilliseconds = 3 * hourMilliseconds;

export type BlockTimes = { startMinutes: number; endMinutes: number };

export type BlockValues = BlockTimes & { weekday: number };

export type BlockDefinition = BlockValues & {
  effectiveFrom: Date;
  effectiveUntil: Date | null;
};

export type PlannedSlot = { startsAt: Date; endsAt: Date; localMonth: Date };

export const assertBlockValues = (values: BlockValues): void => {
  const onGrid = (minute: number) =>
    Number.isInteger(minute) && minute % gridMinutes === 0;

  if (
    !Number.isInteger(values.weekday) ||
    values.weekday < 1 ||
    values.weekday > 7 ||
    !onGrid(values.startMinutes) ||
    !onGrid(values.endMinutes) ||
    values.startMinutes < 0 ||
    values.endMinutes >= 24 * 60 ||
    values.endMinutes - values.startMinutes < evaluationSlotMinutes
  ) {
    throw new EvaluationRuleError(
      'availability_block_invalid_range',
      'Availability Block times must be on the 15-minute grid and hold at least one 45-minute slot',
    );
  }
};

export const slotsPerWeek = (times: BlockTimes): number =>
  Math.max(
    0,
    Math.floor((times.endMinutes - times.startMinutes) / evaluationSlotMinutes),
  );

// ADR-0059: every matching Bolivia date of the horizon inside the block's
// [effectiveFrom, effectiveUntil) range, skipping occurrences already started.
export const plannedSlots = (
  block: BlockDefinition,
  clock: { today: Date; now: Date },
): PlannedSlot[] => {
  const horizon = materializationHorizon(clock.today);
  const first =
    block.effectiveFrom > horizon.from ? block.effectiveFrom : horizon.from;
  const slots: PlannedSlot[] = [];

  for (
    let date = first;
    date <= horizon.through &&
    (block.effectiveUntil === null || date < block.effectiveUntil);
    date = addCivilDays(date, 1)
  ) {
    if (isoWeekday(date) !== block.weekday) continue;

    for (let index = 0; index < slotsPerWeek(block); index += 1) {
      const startsAt = boliviaInstant(
        date,
        block.startMinutes + index * evaluationSlotMinutes,
      );
      if (startsAt <= clock.now) continue;

      slots.push({
        startsAt,
        endsAt: new Date(
          startsAt.getTime() + evaluationSlotMinutes * minuteMilliseconds,
        ),
        localMonth: boliviaMonth(startsAt),
      });
    }
  }

  return slots;
};

export const cancellableUntil = (startsAt: Date): Date =>
  new Date(startsAt.getTime() - bookingLeadMilliseconds);

export const isEvaluationBookable = (startsAt: Date, now: Date): boolean =>
  now < cancellableUntil(startsAt);

// D6: a change takes effect from a date on or after today; a block that has
// not started yet ends at its own start (an empty range).
export const resolveBlockChangeDate = (input: {
  block: { effectiveFrom: Date; effectiveUntil: Date | null };
  selectedDate: Date;
  today: Date;
}): Date => {
  const { block, selectedDate, today } = input;

  if (block.effectiveUntil !== null && block.effectiveUntil <= today) {
    throw new EvaluationRuleError(
      'availability_block_ended',
      'Availability Block has already ended',
    );
  }
  if (selectedDate < today) {
    throw new EvaluationRuleError(
      'availability_block_effective_date_past',
      'The change must take effect today or later',
    );
  }
  if (block.effectiveUntil !== null && selectedDate >= block.effectiveUntil) {
    throw new EvaluationRuleError(
      'availability_block_ended',
      'Availability Block already ends before the selected date',
    );
  }

  return selectedDate > block.effectiveFrom
    ? selectedDate
    : block.effectiveFrom;
};

export type ReminderKind = 'day' | 'hour';

export const reminderDueAt = (kind: ReminderKind, startsAt: Date): Date =>
  new Date(startsAt.getTime() - (kind === 'day' ? 24 : 1) * hourMilliseconds);

// D18: the day reminder only for Evaluations booked before it was due and only
// until the hour reminder takes over; the hour reminder until the start.
export const dueReminders = (
  evaluation: {
    createdAt: Date;
    startsAt: Date;
    dayReminderRecordedAt: Date | null;
    hourReminderRecordedAt: Date | null;
  },
  now: Date,
): ReminderKind[] => {
  const dayDue = reminderDueAt('day', evaluation.startsAt);
  const hourDue = reminderDueAt('hour', evaluation.startsAt);

  if (now >= hourDue) {
    return now < evaluation.startsAt &&
      evaluation.hourReminderRecordedAt === null
      ? ['hour']
      : [];
  }

  return now >= dayDue &&
    evaluation.createdAt < dayDue &&
    evaluation.dayReminderRecordedAt === null
    ? ['day']
    : [];
};
