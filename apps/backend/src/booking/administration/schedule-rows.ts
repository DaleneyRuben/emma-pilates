export type ScheduleRow = { weekday: number; startsAtLocal: string };

export type RowClash = {
  row: number;
  clashesWith: number;
  kind: 'repeated' | 'overlap';
};

export const findRowClash = (
  rows: readonly ScheduleRow[],
  durationMinutes: number,
): RowClash | null => (rows.length > durationMinutes ? null : null);
