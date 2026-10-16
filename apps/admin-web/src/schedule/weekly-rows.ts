import { weekdayName } from "../lib/bolivia-time";
import { startingMinutes } from "./duration-minutes";

/**
 * One «Días y horas» row as the form holds it: ISO weekday, wall clock, and
 * its own minutes (WEB-027).
 */
export type WeeklyRow = {
  weekday: string;
  time: string;
  durationMinutes: string;
};

const weekMinutes = 7 * 24 * 60;

const minuteOfWeek = (row: WeeklyRow): number => {
  const [hours, minutes] = row.time.split(":").map(Number);
  return (
    (Number(row.weekday) - 1) * 24 * 60 + (hours ?? 0) * 60 + (minutes ?? 0)
  );
};

// Minutes from one start forward to another, the week wrapping from Sunday
// night into Monday.
const forward = (from: number, to: number): number =>
  (((to - from) % weekMinutes) + weekMinutes) % weekMinutes;

// The backend refuses the same clash with `schedule_rows_overlap` (WEB-025,
// WEB-027): rows must not repeat or overlap each other, each lasting its own
// minutes. The admin web cannot import backend code, so the rule is repeated
// here to mark the row before anything is sent.
export function rowClash(
  rows: readonly WeeklyRow[],
): { index: number; message: string } | null {
  const starts = rows.map(minuteOfWeek);
  for (let later = 1; later < rows.length; later += 1) {
    for (let earlier = 0; earlier < later; earlier += 1) {
      const gap = forward(starts[earlier] ?? 0, starts[later] ?? 0);
      const overlaps =
        gap < Number(rows[earlier]?.durationMinutes) ||
        weekMinutes - gap < Number(rows[later]?.durationMinutes);
      if (gap === 0 || overlaps) {
        const other = rows[earlier];
        const when = `el ${weekdayName(Number(other?.weekday))} a las ${other?.time ?? ""}`;
        return {
          index: later,
          message: gap === 0 ? `Ya está ${when}.` : `Se cruza con ${when}.`,
        };
      }
    }
  }
  return null;
}

/** «Agregar día»: the day after the last row's, at its time and minutes. */
export function nextRow(last: WeeklyRow | undefined): WeeklyRow {
  const weekday = Number(last?.weekday);
  return {
    weekday: weekday >= 1 && weekday <= 7 ? String((weekday % 7) + 1) : "",
    time: last?.time ?? "",
    durationMinutes: last?.durationMinutes ?? startingMinutes,
  };
}

export const rowLabel = (row: WeeklyRow, position: number): string =>
  row.weekday !== "" && row.time !== ""
    ? `${weekdayName(Number(row.weekday))} ${row.time}`
    : `fila ${position}`;
