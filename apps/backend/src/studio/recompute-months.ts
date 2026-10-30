import { boliviaMonth } from '../time/bolivia-time';

// The months the daily studio facts run recomputes.
export const studioMonthsToRecompute = (now: Date): Date[] => [
  boliviaMonth(now),
];
