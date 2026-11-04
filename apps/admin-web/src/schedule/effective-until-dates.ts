import { parseCivilDate } from "../components/form/civil-date";
import { addDays } from "../lib/bolivia-time";

// BKM-018: «Vigente hasta (opcional)» is the last date with classes; the API
// keeps the day after as the series' exclusive end, and null for no end.
export const toExclusiveEnd = (lastDate: string): string | null =>
  lastDate === "" ? null : addDays(lastDate, 1);

export const fromExclusiveEnd = (end: string | null): string =>
  end === null ? "" : addDays(end, -1);

// The message for a last date that is not a date or comes before the start;
// null when it is fine (empty means no end).
export const lastDateProblem = (
  lastDate: string,
  effectiveFrom: string,
): string | null => {
  if (lastDate === "") return null;
  if (parseCivilDate(lastDate) === null) return "Elige una fecha válida.";
  return parseCivilDate(effectiveFrom) !== null && lastDate < effectiveFrom
    ? "Elige una fecha desde «Vigente desde» en adelante."
    : null;
};
