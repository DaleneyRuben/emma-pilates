import { formatCivilDayMonth } from "../assistant/assistant-format";

/** «8 días» from the first to the last frozen day, both counted. */
export function freezeDays(startsOn: string, endsOn: string): string {
  const days =
    Math.round(
      (new Date(`${endsOn}T12:00:00.000Z`).getTime() -
        new Date(`${startsOn}T12:00:00.000Z`).getTime()) /
        86_400_000,
    ) + 1;
  return days === 1 ? "1 día" : `${days} días`;
}

/** «27 de octubre al 3 de noviembre». */
export function freezeRange(startsOn: string, endsOn: string): string {
  return `${formatCivilDayMonth(startsOn)} al ${formatCivilDayMonth(endsOn)}`;
}
