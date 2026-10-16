import { weekdayName } from "../lib/bolivia-time";

/** One «Días y horas» row as the form holds it: ISO weekday and wall clock. */
export type WeeklyRow = { weekday: string; time: string };

const weekMinutes = 7 * 24 * 60;

const minuteOfWeek = (row: WeeklyRow): number => {
  const [hours, minutes] = row.time.split(":").map(Number);
  return (
    (Number(row.weekday) - 1) * 24 * 60 + (hours ?? 0) * 60 + (minutes ?? 0)
  );
};

// The backend refuses the same clash with `schedule_rows_overlap` (WEB-025):
// rows must not repeat or overlap each other, the week wrapping from Sunday
// night into Monday. The admin web cannot import backend code, so the rule is
// repeated here to mark the row before anything is sent.
export function rowClash(
  rows: readonly WeeklyRow[],
  durationMinutes: number,
): { index: number; message: string } | null {
  const starts = rows.map(minuteOfWeek);
  for (let later = 1; later < starts.length; later += 1) {
    for (let earlier = 0; earlier < later; earlier += 1) {
      const gap = Math.abs((starts[later] ?? 0) - (starts[earlier] ?? 0));
      const apart = Math.min(gap, weekMinutes - gap);
      if (apart < durationMinutes) {
        const other = rows[earlier];
        const when = `el ${weekdayName(Number(other?.weekday))} a las ${other?.time ?? ""}`;
        return {
          index: later,
          message: apart === 0 ? `Ya está ${when}.` : `Se cruza con ${when}.`,
        };
      }
    }
  }
  return null;
}

/** «Agregar día»: the day after the last row's, at the last row's time. */
export function nextRow(last: WeeklyRow | undefined): WeeklyRow {
  const weekday = Number(last?.weekday);
  return {
    weekday: weekday >= 1 && weekday <= 7 ? String((weekday % 7) + 1) : "",
    time: last?.time ?? "",
  };
}

export const rowLabel = (row: WeeklyRow, position: number): string =>
  row.weekday !== "" && row.time !== ""
    ? `${weekdayName(Number(row.weekday))} ${row.time}`
    : `fila ${position}`;
