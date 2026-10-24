import { baseRemainingAfterCap } from './weekly-cap';

export type WeeklyCapPosition = {
  weeklyClassCap?: number | null;
  baseFundedBookingsThisWeek?: number;
  extraClasses?: number;
};

export const weeklyCapBlocks = (position: WeeklyCapPosition): boolean => {
  if (position.weeklyClassCap === undefined) return false;
  const remaining = baseRemainingAfterCap({
    weeklyClassCap: position.weeklyClassCap,
    baseFundedBookings: position.baseFundedBookingsThisWeek ?? 0,
    remainingClassAllowance: 1,
    extraClasses: position.extraClasses ?? 0,
  });
  return remaining.baseAvailable === 0 && (position.extraClasses ?? 0) <= 0;
};

export const assertWeeklyCapAllows = (position: WeeklyCapPosition): void => {
  if (weeklyCapBlocks(position)) {
    throw new Error('Weekly cap reached');
  }
};
