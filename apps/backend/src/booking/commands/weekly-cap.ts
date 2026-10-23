import { addCivilDays, boliviaDate, isoWeekday } from '../../time/bolivia-time';

// Monday–Sunday in America/La_Paz, as Bolivia civil dates at UTC midnight.
export const boliviaWeek = (
  instant: Date,
): { startsOn: Date; endsOn: Date } => {
  const date = boliviaDate(instant);
  const startsOn = addCivilDays(date, 1 - isoWeekday(date));
  return { startsOn, endsOn: addCivilDays(startsOn, 6) };
};

// The cap counts base-funded Bookings only. Past it the caller spends an
// extra class by passing a base of zero to chooseAllowanceSource.
export const baseRemainingAfterCap = (input: {
  weeklyClassCap: number | null;
  baseFundedBookings: number;
  remainingClassAllowance: number;
  extraClasses: number;
}): { baseAvailable: number; classesLeftThisWeek: number | null } => {
  void input.extraClasses;
  if (input.weeklyClassCap === null) {
    return {
      baseAvailable: input.remainingClassAllowance,
      classesLeftThisWeek: null,
    };
  }
  const classesLeftThisWeek = Math.max(
    0,
    input.weeklyClassCap - input.baseFundedBookings,
  );
  return {
    baseAvailable: Math.min(input.remainingClassAllowance, classesLeftThisWeek),
    classesLeftThisWeek,
  };
};
