import { EvaluationRuleError } from './evaluation-errors';
import {
  assertBlockValues,
  cancellableUntil,
  dueReminders,
  isEvaluationBookable,
  materializationHorizon,
  plannedSlots,
  resolveBlockChangeDate,
  slotsPerWeek,
} from './evaluation-rules';

const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);
const at = (instant: string): Date => new Date(instant);
const minutes = (clock: string): number => {
  const [hours, mins] = clock.split(':').map(Number);
  return hours * 60 + mins;
};

const codeOf = (work: () => unknown): string => {
  try {
    work();
    return 'returned';
  } catch (error) {
    return error instanceof EvaluationRuleError ? error.code : String(error);
  }
};

const mondayMorning = {
  weekday: 1,
  startMinutes: minutes('09:00'),
  endMinutes: minutes('13:00'),
  effectiveFrom: civil('2026-09-21'),
  effectiveUntil: null,
};

describe('Availability Block values', () => {
  it('accepts ISO weekdays and 15-minute grid ranges of at least one slot', () => {
    expect(
      codeOf(() =>
        assertBlockValues({
          weekday: 6,
          startMinutes: minutes('10:30'),
          endMinutes: minutes('11:15'),
        }),
      ),
    ).toBe('returned');
  });

  it.each([
    {
      weekday: 0,
      startMinutes: minutes('09:00'),
      endMinutes: minutes('10:00'),
    },
    {
      weekday: 8,
      startMinutes: minutes('09:00'),
      endMinutes: minutes('10:00'),
    },
    {
      weekday: 1,
      startMinutes: minutes('10:00'),
      endMinutes: minutes('09:00'),
    },
    {
      weekday: 1,
      startMinutes: minutes('09:00'),
      endMinutes: minutes('09:30'),
    },
    {
      weekday: 1,
      startMinutes: minutes('09:10'),
      endMinutes: minutes('10:00'),
    },
    {
      weekday: 1,
      startMinutes: minutes('09:00'),
      endMinutes: minutes('10:05'),
    },
    { weekday: 1, startMinutes: minutes('09:00'), endMinutes: 24 * 60 },
  ])('rejects %o as an invalid range', (values) => {
    expect(codeOf(() => assertBlockValues(values))).toBe(
      'availability_block_invalid_range',
    );
  });

  it('counts back-to-back 45-minute slots and drops a shorter remainder', () => {
    expect(slotsPerWeek(mondayMorning)).toBe(5);
    expect(
      slotsPerWeek({
        startMinutes: minutes('09:00'),
        endMinutes: minutes('12:00'),
      }),
    ).toBe(4);
  });
});

describe('slot materialization', () => {
  it('covers Bolivia dates from today through today + 30', () => {
    expect(materializationHorizon(civil('2026-09-22'))).toEqual({
      from: civil('2026-09-22'),
      through: civil('2026-10-22'),
    });
  });

  it('cuts every matching weekday of the horizon into 45-minute instants with their Bolivia month', () => {
    const slots = plannedSlots(mondayMorning, {
      today: civil('2026-09-22'),
      now: at('2026-09-22T15:00:00.000Z'),
    });

    expect(slots).toHaveLength(20);
    expect(slots.slice(0, 5).map((slot) => slot.startsAt)).toEqual([
      at('2026-09-28T13:00:00.000Z'),
      at('2026-09-28T13:45:00.000Z'),
      at('2026-09-28T14:30:00.000Z'),
      at('2026-09-28T15:15:00.000Z'),
      at('2026-09-28T16:00:00.000Z'),
    ]);
    expect(slots[0]).toEqual({
      startsAt: at('2026-09-28T13:00:00.000Z'),
      endsAt: at('2026-09-28T13:45:00.000Z'),
      localMonth: civil('2026-09-01'),
    });
    expect(slots.at(-1)?.startsAt).toEqual(at('2026-10-19T16:00:00.000Z'));
    expect(slots.at(-1)?.localMonth).toEqual(civil('2026-10-01'));
  });

  it('includes the last horizon day and skips occurrences that already started today', () => {
    const slots = plannedSlots(mondayMorning, {
      today: civil('2026-09-21'),
      now: at('2026-09-21T14:00:00.000Z'),
    });

    expect(slots[0].startsAt).toEqual(at('2026-09-21T14:30:00.000Z'));
    expect(slots.at(-1)?.startsAt).toEqual(at('2026-10-19T16:00:00.000Z'));
    expect(
      plannedSlots(mondayMorning, {
        today: civil('2026-09-22'),
        now: at('2026-09-22T12:00:00.000Z'),
      }).some((slot) => slot.startsAt >= at('2026-10-22T04:00:00.000Z')),
    ).toBe(false);
  });

  it('respects the effective range and assigns a late local slot to its Bolivia month', () => {
    const lateWednesday = {
      weekday: 3,
      startMinutes: minutes('20:15'),
      endMinutes: minutes('21:00'),
      effectiveFrom: civil('2026-09-30'),
      effectiveUntil: civil('2026-10-07'),
    };

    expect(
      plannedSlots(lateWednesday, {
        today: civil('2026-09-22'),
        now: at('2026-09-22T12:00:00.000Z'),
      }),
    ).toEqual([
      {
        startsAt: at('2026-10-01T00:15:00.000Z'),
        endsAt: at('2026-10-01T01:00:00.000Z'),
        localMonth: civil('2026-09-01'),
      },
    ]);
    expect(
      plannedSlots(
        { ...mondayMorning, effectiveUntil: civil('2026-09-21') },
        { today: civil('2026-09-21'), now: at('2026-09-21T04:00:00.000Z') },
      ),
    ).toEqual([]);
  });
});

describe('booking and cancellation windows', () => {
  const startsAt = at('2026-09-28T13:00:00.000Z');

  it('closes booking and Client cancellation exactly 3 hours before the start', () => {
    expect(isEvaluationBookable(startsAt, at('2026-09-28T09:59:59.999Z'))).toBe(
      true,
    );
    expect(isEvaluationBookable(startsAt, at('2026-09-28T10:00:00.000Z'))).toBe(
      false,
    );
    expect(cancellableUntil(startsAt)).toEqual(at('2026-09-28T10:00:00.000Z'));
  });
});

describe('block change dates', () => {
  const today = civil('2026-09-22');

  it('ends from the selected date, or from the start of a block that has not begun', () => {
    expect(
      resolveBlockChangeDate({
        block: mondayMorning,
        selectedDate: civil('2026-10-05'),
        today,
      }),
    ).toEqual(civil('2026-10-05'));
    expect(
      resolveBlockChangeDate({
        block: { ...mondayMorning, effectiveFrom: civil('2026-10-12') },
        selectedDate: civil('2026-10-05'),
        today,
      }),
    ).toEqual(civil('2026-10-12'));
  });

  it('rejects past dates, ended blocks, and dates at or after an existing end', () => {
    expect(
      codeOf(() =>
        resolveBlockChangeDate({
          block: mondayMorning,
          selectedDate: civil('2026-09-21'),
          today,
        }),
      ),
    ).toBe('availability_block_effective_date_past');
    expect(
      codeOf(() =>
        resolveBlockChangeDate({
          block: { ...mondayMorning, effectiveUntil: civil('2026-09-22') },
          selectedDate: today,
          today,
        }),
      ),
    ).toBe('availability_block_ended');
    expect(
      codeOf(() =>
        resolveBlockChangeDate({
          block: { ...mondayMorning, effectiveUntil: civil('2026-10-05') },
          selectedDate: civil('2026-10-05'),
          today,
        }),
      ),
    ).toBe('availability_block_ended');
  });
});

describe('Evaluation reminders', () => {
  const startsAt = at('2026-09-28T13:00:00.000Z');
  const booked = {
    createdAt: at('2026-09-20T12:00:00.000Z'),
    startsAt,
    dayReminderRecordedAt: null,
    hourReminderRecordedAt: null,
  };

  it('sends the day reminder from 24 hours before until the hour reminder is due', () => {
    expect(dueReminders(booked, at('2026-09-27T12:59:59.999Z'))).toEqual([]);
    expect(dueReminders(booked, at('2026-09-27T13:00:00.000Z'))).toEqual([
      'day',
    ]);
    expect(dueReminders(booked, at('2026-09-28T11:59:59.999Z'))).toEqual([
      'day',
    ]);
  });

  it('supersedes an overdue day reminder with the hour reminder until the start', () => {
    expect(dueReminders(booked, at('2026-09-28T12:00:00.000Z'))).toEqual([
      'hour',
    ]);
    expect(dueReminders(booked, at('2026-09-28T12:59:59.999Z'))).toEqual([
      'hour',
    ]);
    expect(dueReminders(booked, startsAt)).toEqual([]);
  });

  it('skips the day reminder for an Evaluation booked inside 24 hours and never repeats a recorded one', () => {
    expect(
      dueReminders(
        { ...booked, createdAt: at('2026-09-28T00:00:00.000Z') },
        at('2026-09-28T01:00:00.000Z'),
      ),
    ).toEqual([]);
    expect(
      dueReminders(
        { ...booked, dayReminderRecordedAt: at('2026-09-27T13:00:00.000Z') },
        at('2026-09-27T14:00:00.000Z'),
      ),
    ).toEqual([]);
    expect(
      dueReminders(
        { ...booked, hourReminderRecordedAt: at('2026-09-28T12:00:00.000Z') },
        at('2026-09-28T12:30:00.000Z'),
      ),
    ).toEqual([]);
  });
});
