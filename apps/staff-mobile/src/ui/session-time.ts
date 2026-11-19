import { formatListDate } from "@pilates/api-contracts";
import { formatSessionDate, formatTimeRange } from "@pilates/mobile-core";

/** «07:00»: the start alone, for the time column of a v2 class row. */
export function startTime(startsAt: string, endsAt: string): string {
  return formatTimeRange(startsAt, endsAt).split(" – ")[0] ?? "";
}

/** «60 min» under the start on S02. */
export function minutesLabel(startsAt: string, endsAt: string): string {
  const minutes = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
  return `${minutes} min`;
}

/** «Martes 3 de noviembre» for a civil date. */
export function dayHeading(civilDate: string): string {
  const label = formatSessionDate(`${civilDate}T12:00:00.000Z`);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** «1 clase», «3 clases». */
export function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// FIX-090 (audit S8): a day whose classes were all cancelled says so instead
// of «no hay clases»: «Todas las clases de hoy se cancelaron».
export function allCancelledTitle(date: string, today: string): string {
  return date === today
    ? "Todas las clases de hoy se cancelaron"
    : `Todas las clases del ${formatListDate(date)} se cancelaron`;
}

// «Hoy no hay Mat» or «El martes no hay Mat» (walkthrough 6, option A).
export function noClassesOfType(date: string, today: string, typeName: string): string {
  if (date === today) return `Hoy no hay ${typeName}`;
  return `El ${dayHeading(date).split(" ")[0]?.toLowerCase()} no hay ${typeName}`;
}
