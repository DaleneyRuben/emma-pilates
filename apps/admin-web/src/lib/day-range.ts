import { formatListDate } from "@pilates/api-contracts";

/**
 * FIX-091: «sáb 21 al mar 24 nov», a span of civil days (`yyyy-mm-dd`) in the
 * list format, saying the month once when both days share it
 * («lun 30 nov al mié 2 dic» otherwise).
 */
export function formatDayRange(startsOn: string, endsOn: string): string {
  const start = formatListDate(startsOn);
  const end = formatListDate(endsOn);
  if (startsOn.slice(0, 7) !== endsOn.slice(0, 7)) return `${start} al ${end}`;
  return `${start.slice(0, start.lastIndexOf(" "))} al ${end}`;
}
