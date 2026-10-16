export type ScheduleRow = { weekday: number; startsAtLocal: string };

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

// Rows of one Class Type created together must not repeat or overlap each
// other, the week wrapping from Sunday night into Monday (WEB-025). Rows
// are numbered from 1, as the form shows them.
export const findRowClash = (
  rows: readonly ScheduleRow[],
  durationMinutes: number,
): RowClash | null => {
  const starts = rows.map(minuteOfWeek);
  for (let later = 1; later < starts.length; later += 1) {
    for (let earlier = 0; earlier < later; earlier += 1) {
      const gap = Math.abs((starts[later] ?? 0) - (starts[earlier] ?? 0));
      const apart = Math.min(gap, weekMinutes - gap);
      if (apart < durationMinutes) {
        return {
          row: later + 1,
          clashesWith: earlier + 1,
          kind: apart === 0 ? 'repeated' : 'overlap',
        };
      }
    }
  }
  return null;
};
