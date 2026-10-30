import { boliviaDate, boliviaInstant } from '../time/bolivia-time';

const morningMinute = 9 * 60;

// A date-triggered push is about a Bolivia day, so it waits until 09:00 that
// day and is stamped with that morning, never with the midnight sweep.
export const dateTriggeredPushInstant = (now: Date): Date | null => {
  const today = boliviaDate(now);
  const morning = boliviaInstant(today, morningMinute);
  return now.getTime() >= morning.getTime() ? morning : null;
};
