import { formatListDate } from "@pilates/api-contracts";
import { boliviaCivilDate } from "@pilates/mobile-core";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * FIX-090: the shared list date, «mar 15 dic», never «15/12/2026». A QR may
 * be valid for up to five years, so a day past this year keeps its year.
 */
export const qrDate = (date: string, now: Date = new Date()): string => {
  const year = date.slice(0, 4);
  const listDate = formatListDate(date);
  return year === boliviaCivilDate(now).slice(0, 4) ? listDate : `${listDate} ${year}`;
};

// The API refuses a last day that is not after today or is more than five
// years away (FIX-072); the calendar offers the same span.
export function validUntilSpan(today: string) {
  const [year, month, day] = today.split("-").map(Number);
  const latest = `${year + 5}-${pad(month)}-${pad(day)}`;
  return {
    firstMonth: today.slice(0, 7),
    lastMonth: latest.slice(0, 7),
    isOff: (candidate: string) => candidate <= today || candidate > latest,
  };
}
