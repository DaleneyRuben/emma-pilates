import type { ClassHistoryEntryDto } from "@pilates/api-contracts";

import { boliviaCivilDate, dayChipLabel, formatMonthHeading } from "../time/session-format";

export type ClassHistoryGroup = {
  heading: string;
  entries: ClassHistoryEntryDto[];
};

/** Splits the newest-first history into its month groups, in order. */
export function groupClassHistoryByMonth(entries: ClassHistoryEntryDto[]): ClassHistoryGroup[] {
  const groups: ClassHistoryGroup[] = [];
  for (const entry of entries) {
    const heading = formatMonthHeading(entry.startsAt);
    const group = groups.at(-1);
    if (group !== undefined && group.heading === heading) {
      group.entries.push(entry);
    } else {
      groups.push({ heading, entries: [entry] });
    }
  }
  return groups;
}

export function classCountLabel(count: number): string {
  return `${count} ${count === 1 ? "clase" : "clases"}`;
}

const monthFormatter = new Intl.DateTimeFormat("es-BO", {
  month: "long",
  timeZone: "America/La_Paz",
});
const yearFormatter = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  year: "numeric",
});

/** The frames' «37 clases desde marzo»; the year is named only when it differs. */
export function summarizeClassHistory(entries: ClassHistoryEntryDto[]): string {
  const newest = new Date(entries[0].startsAt);
  const oldest = new Date(entries[entries.length - 1].startsAt);
  const since = monthFormatter.format(oldest);
  const year =
    yearFormatter.format(oldest) === yearFormatter.format(newest)
      ? ""
      : ` de ${yearFormatter.format(oldest)}`;
  return `${classCountLabel(entries.length)} desde ${since}${year}`;
}

/** The row's day column: the Bolivia day of the month, zero-padded, and its weekday. */
export function historyDayLabel(startsAt: string): { day: string; weekday: string } {
  const civilDate = boliviaCivilDate(new Date(startsAt));
  return { day: civilDate.slice(8, 10), weekday: dayChipLabel(civilDate).weekday };
}
