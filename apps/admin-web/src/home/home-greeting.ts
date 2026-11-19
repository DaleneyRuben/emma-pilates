import { formatTitleDate } from "@pilates/api-contracts";
import { boliviaParts } from "../lib/bolivia-time";

const greetingAt = (minutes: number): string =>
  minutes < 12 * 60
    ? "Buenos días"
    : minutes < 19 * 60
      ? "Buenas tardes"
      : "Buenas noches";

/** P01's title and the line under it, in Bolivia time (ADR-0057). */
export function homeGreeting(
  name: string,
  now: Date = new Date(),
): { title: string; day: string } {
  const { date, minutes } = boliviaParts(now);
  const first = name.trim().split(/\s+/)[0] ?? "";
  return {
    title:
      first === "" ? greetingAt(minutes) : `${greetingAt(minutes)}, ${first}`,
    day: formatTitleDate(date),
  };
}
