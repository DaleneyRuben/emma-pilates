export type ScheduleRow = {
  weekday: number;
  startsAtLocal: string;
  durationMinutes: number;
};

export type RowClash = {
  row: number;
  clashesWith: number;
  kind: 'repeated' | 'overlap';
};

const weekMinutes = 7 * 24 * 60;

const minuteOfWeek = ({ weekday, startsAtLocal }: ScheduleRow): number => {
  const [hours, minutes] = startsAtLocal.split(':').map(Number);
  return (weekday - 1) * 24 * 60 + (hours ?? 0) * 60 + (minutes ?? 0);
};

// Minutes from one start forward to another, the week wrapping from Sunday
// night into Monday.
const forward = (from: number, to: number): number =>
  (((to - from) % weekMinutes) + weekMinutes) % weekMinutes;

// Rows of one Class Type created together must not repeat or overlap each
// other, each lasting its own minutes (WEB-025, WEB-027). Rows are numbered
// from 1, as the form shows them.
export const findRowClash = (rows: readonly ScheduleRow[]): RowClash | null => {
  const starts = rows.map(minuteOfWeek);
  for (let later = 1; later < rows.length; later += 1) {
    for (let earlier = 0; earlier < later; earlier += 1) {
      const gap = forward(starts[earlier] ?? 0, starts[later] ?? 0);
      if (gap === 0) {
        return { row: later + 1, clashesWith: earlier + 1, kind: 'repeated' };
      }
      if (
        gap < (rows[earlier]?.durationMinutes ?? 0) ||
        weekMinutes - gap < (rows[later]?.durationMinutes ?? 0)
      ) {
        return { row: later + 1, clashesWith: earlier + 1, kind: 'overlap' };
      }
    }
  }
  return null;
};
