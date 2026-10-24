import { addCivilDays, boliviaDate, isoWeekday } from '../../time/bolivia-time';
import { baseRemainingAfterCap, boliviaWeek } from './weekly-cap';

// BKM-007, booking ADR-0006: the week is Monday–Sunday in America/La_Paz.
// A Booking funded from the base allowance counts; an extra class does not.
describe('boliviaWeek', () => {
  it('splits Sunday 23:00 from Monday 00:30 in La Paz', () => {
    const sundayNight = new Date('2026-10-26T03:00:00.000Z');
    const mondayMorning = new Date('2026-10-26T04:30:00.000Z');

    expect(boliviaWeek(sundayNight)).toEqual({
      startsOn: new Date('2026-10-19T00:00:00.000Z'),
      endsOn: new Date('2026-10-25T00:00:00.000Z'),
    });
    expect(boliviaWeek(mondayMorning)).toEqual({
      startsOn: new Date('2026-10-26T00:00:00.000Z'),
      endsOn: new Date('2026-11-01T00:00:00.000Z'),
    });
    expect(isoWeekday(boliviaDate(sundayNight))).toBe(7);
    expect(isoWeekday(boliviaDate(mondayMorning))).toBe(1);
  });

  it('keeps a Monday and the following Sunday in one week', () => {
    const monday = boliviaWeek(new Date('2026-10-26T04:00:00.000Z'));
    const sunday = boliviaWeek(new Date('2026-11-02T03:59:00.000Z'));

    expect(sunday.startsOn).toEqual(monday.startsOn);
    expect(addCivilDays(monday.startsOn, 6)).toEqual(monday.endsOn);
  });
});

describe('baseRemainingAfterCap', () => {
  it('leaves the base untouched when the Plan has no cap', () => {
    expect(
      baseRemainingAfterCap({
        weeklyClassCap: null,
        baseFundedBookings: 12,
        remainingClassAllowance: 4,
        extraClasses: 0,
      }),
    ).toEqual({ baseAvailable: 4, classesLeftThisWeek: null });
  });

  it('reports the classes left this week and blocks the base at the cap', () => {
    expect(
      baseRemainingAfterCap({
        weeklyClassCap: 3,
        baseFundedBookings: 3,
        remainingClassAllowance: 10,
        extraClasses: 1,
      }),
    ).toEqual({ baseAvailable: 0, classesLeftThisWeek: 0 });
    expect(
      baseRemainingAfterCap({
        weeklyClassCap: 3,
        baseFundedBookings: 1,
        remainingClassAllowance: 2,
        extraClasses: 0,
      }),
    ).toEqual({ baseAvailable: 2, classesLeftThisWeek: 2 });
  });
});
