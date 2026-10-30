import { boliviaDate, boliviaMonth } from '../time/bolivia-time';

// FIX-008. Late attendance, voids, and window-close snapshots still change a
// month after it ends, so the daily run keeps recomputing the previous month
// through day 8 of the next one (La Paz time). From day 9 it is final.
const lastDayToFinalize = 8;

export const studioMonthsToRecompute = (now: Date): Date[] => {
  const current = boliviaMonth(now);
  if (boliviaDate(now).getUTCDate() > lastDayToFinalize) return [current];
  const previous = new Date(
    Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1),
  );
  return [previous, current];
};
