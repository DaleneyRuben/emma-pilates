import { countLabel, minutesOf, slotMinutes } from "./nutritionist-format";

export type TimeField = "start" | "end";

// A block sits on a 15-minute grid from 6:00 to 22:00 (NUT-001 D2) and
// holds at least one 45-minute turno, so the end comes 45 minutes after the
// start or later (follow-up 262).
const firstMinute = 6 * 60;
const lastMinute = 22 * 60;
export const quarterMinutes = [0, 15, 30, 45] as const;

type Bounds = readonly [number, number];

export function wheelBounds(field: TimeField, start: string | null): Bounds {
  if (field === "start") return [firstMinute, lastMinute - slotMinutes];
  const earliest = firstMinute + slotMinutes;
  return [
    start === null ? earliest : Math.max(minutesOf(start) + slotMinutes, earliest),
    lastMinute,
  ];
}

const clamp = (minute: number, [low, high]: Bounds) => Math.min(Math.max(minute, low), high);

// The time the wheel opens on: the field's own, else 9:00 for a start and an
// hour after the start for an end.
export function openingMinute(field: TimeField, value: string | null, start: string | null) {
  const wanted =
    value !== null
      ? minutesOf(value)
      : field === "start"
        ? 9 * 60
        : start === null
          ? 10 * 60
          : minutesOf(start) + 60;
  return clamp(wanted, wheelBounds(field, start));
}

export function wheelHours(field: TimeField): number[] {
  const last = field === "start" ? 21 : 22;
  return Array.from({ length: last - 5 }, (_, index) => 6 + index);
}

// Where the wheel lands when an hour is chosen: the same quarter if it fits,
// else the nearest quarter of that hour that does; null when none does.
export function hourTarget(hour: number, draft: number, bounds: Bounds): number | null {
  const low = Math.max(hour * 60, bounds[0]);
  const high = Math.min(hour * 60 + 45, bounds[1]);
  if (low > high) return null;
  return clamp(hour * 60 + (draft % 60), [low, high]);
}

export function minuteTarget(minute: number, draft: number, bounds: Bounds): number | null {
  const target = Math.floor(draft / 60) * 60 + minute;
  return target >= bounds[0] && target <= bounds[1] ? target : null;
}

// «3 h · 4 turnos de 45 min» under the end's time.
export function lengthLine(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const length = hours === 0 ? `${rest} min` : rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
  const turnos = Math.floor(minutes / slotMinutes);
  return `${length} · ${countLabel(turnos, "turno", "turnos")} de 45 min`;
}

export const startLine = "Cada 15 minutos, de 6:00 a 22:00";
