import { addCivilDays, boliviaDate } from '../../time/bolivia-time';
import { elapsedCivilDays } from './first-90-days-milestones';

export const contactAlertReasons = [
  'no_booking_7_days',
  'fewer_than_2_classes_by_day_15',
  'fewer_than_4_classes_in_first_30_days',
] as const;

export type ContactAlertReason = (typeof contactAlertReasons)[number];

export const firstNinetyDaysWindow = 90;

export const isWithinFirstNinetyDays = (
  startsOn: Date,
  today: Date,
): boolean => {
  const elapsed = elapsedCivilDays(startsOn, today);
  return elapsed >= 0 && elapsed <= firstNinetyDaysWindow;
};

export const shouldOpenNoBooking7Days = (input: {
  startsOn: Date;
  today: Date;
  lastBookedOn: Date | null;
  hasUpcomingBooking: boolean;
}): boolean => {
  if (!isWithinFirstNinetyDays(input.startsOn, input.today)) return false;
  if (input.hasUpcomingBooking) return false;
  const since = input.lastBookedOn ?? input.startsOn;
  return elapsedCivilDays(since, input.today) >= 7;
};

export const shouldOpenFewerThan2ByDay15 = (input: {
  startsOn: Date;
  today: Date;
  bookedClassCount: number;
}): boolean =>
  isWithinFirstNinetyDays(input.startsOn, input.today) &&
  elapsedCivilDays(input.startsOn, input.today) >= 15 &&
  input.bookedClassCount < 2;

export const shouldOpenFewerThan4InFirst30Days = (input: {
  startsOn: Date;
  today: Date;
  bookedClassCount: number;
}): boolean =>
  isWithinFirstNinetyDays(input.startsOn, input.today) &&
  elapsedCivilDays(input.startsOn, input.today) >= 30 &&
  input.bookedClassCount < 4;

export const shouldReopenNoBooking7Days = (input: {
  conditionsHold: boolean;
  openUncontacted: boolean;
  lastContactedAt: Date | null;
  lastBookedAt: Date | null;
}): boolean => {
  if (!input.conditionsHold || input.openUncontacted) return false;
  if (input.lastContactedAt === null) return true;
  return (
    input.lastBookedAt !== null &&
    input.lastBookedAt.getTime() > input.lastContactedAt.getTime()
  );
};

// A class counts for a milestone only when it starts inside that many civil
// days of the first Plan, on the La Paz calendar, not whenever in her life
// she booked it.
export const classesInsideFirstDays = (
  startsOn: Date,
  days: number,
  startsAt: readonly Date[],
): number => {
  const until = addCivilDays(startsOn, days).getTime();
  return startsAt.filter((instant) => {
    const day = boliviaDate(instant).getTime();
    return day >= startsOn.getTime() && day < until;
  }).length;
};

export const hasBookedSince = (
  openedAt: Date,
  bookedAt: readonly Date[],
): boolean =>
  bookedAt.some((createdAt) => createdAt.getTime() > openedAt.getTime());
