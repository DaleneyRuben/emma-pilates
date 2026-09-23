import {
  addCivilDays,
  boliviaDate,
  boliviaInstant,
  boliviaMonth,
  isoWeekday,
} from './bolivia-time';

describe('Bolivia civil date', () => {
  it('encodes the Bolivia calendar day at UTC midnight', () => {
    expect(boliviaDate(new Date('2026-09-21T04:00:00.000Z'))).toEqual(
      new Date('2026-09-21T00:00:00.000Z'),
    );
  });

  it('stays on the previous Bolivia day before 04:00 UTC', () => {
    expect(boliviaDate(new Date('2026-09-21T03:30:00.000Z'))).toEqual(
      new Date('2026-09-20T00:00:00.000Z'),
    );
  });
});

describe('Bolivia wall-clock instants', () => {
  it('converts a Bolivia date and minute of day through the tz database', () => {
    expect(
      boliviaInstant(new Date('2026-09-28T00:00:00.000Z'), 9 * 60),
    ).toEqual(new Date('2026-09-28T13:00:00.000Z'));
    expect(
      boliviaInstant(new Date('2026-09-30T00:00:00.000Z'), 23 * 60 + 15),
    ).toEqual(new Date('2026-10-01T03:15:00.000Z'));
  });

  it('reads the Bolivia month and ISO weekday of civil dates', () => {
    expect(boliviaMonth(new Date('2026-10-01T03:15:00.000Z'))).toEqual(
      new Date('2026-09-01T00:00:00.000Z'),
    );
    expect(isoWeekday(new Date('2026-09-28T00:00:00.000Z'))).toBe(1);
    expect(isoWeekday(new Date('2026-10-04T00:00:00.000Z'))).toBe(7);
    expect(addCivilDays(new Date('2026-09-30T00:00:00.000Z'), 2)).toEqual(
      new Date('2026-10-02T00:00:00.000Z'),
    );
  });
});
