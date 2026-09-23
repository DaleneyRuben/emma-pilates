const timeZone = "America/La_Paz";

export const weekdayNames = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

// ISO weekday (Monday = 1) to its Spanish name and three-letter tag.
export function weekdayName(weekday: number): string {
  return weekdayNames[weekday - 1] ?? "";
}

export function weekdayTag(weekday: number): string {
  return weekdayName(weekday).slice(0, 3);
}

// "09:00" → "9:00", as the designs write block ranges.
export function displayTime(localTime: string): string {
  return localTime.replace(/^0(\d)/, "$1");
}

export function minutesOf(localTime: string): number {
  const [hours = "0", minutes = "0"] = localTime.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function localTimeOf(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  return `${hours}:${String(minutes % 60).padStart(2, "0")}`;
}

export const slotMinutes = 45;

export function turnosIn(startsAtLocal: string, endsAtLocal: string): number {
  return Math.max(
    0,
    Math.floor((minutesOf(endsAtLocal) - minutesOf(startsAtLocal)) / slotMinutes),
  );
}

// The 15-minute grid a block's start and end sit on (NUT-001 D2).
export const quarterHours: string[] = Array.from(
  { length: (22 - 6) * 4 + 1 },
  (_, index) => localTimeOf(6 * 60 + index * 15),
);

const civilDateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone,
  year: "numeric",
});

export function boliviaToday(now = new Date()): string {
  return civilDateFormatter.format(now);
}

export function addCivilDays(civilDate: string, amount: number): string {
  const date = new Date(`${civilDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

const longCivilDate = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
});
const shortCivilDate = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
});

// "jueves 1 de octubre" for "2099-10-01".
export function civilDateLong(civilDate: string): string {
  return longCivilDate.format(new Date(`${civilDate}T12:00:00.000Z`)).replace(",", "");
}

// "Hoy", "Mañana", or "jue 1 oct".
export function civilDateChip(civilDate: string, today: string): string {
  if (civilDate === today) return "Hoy";
  if (civilDate === addCivilDays(today, 1)) return "Mañana";
  return shortCivilDate
    .format(new Date(`${civilDate}T12:00:00.000Z`))
    .replace(",", "")
    .replace(/\./g, "");
}

const clockFormatter = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  timeZone,
});

export function clockTime(instant: string): string {
  return clockFormatter.format(new Date(instant));
}

export function civilDateOf(instant: string): string {
  return boliviaToday(new Date(instant));
}

const capitalized = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

// Agenda day headings: "Hoy · jueves 14 de agosto", "Mañana · …", or
// "Sábado 16 de agosto".
export function agendaDayLabel(civilDate: string, today: string): string {
  const long = civilDateLong(civilDate);
  if (civilDate === today) return `Hoy · ${long}`;
  if (civilDate === addCivilDays(today, 1)) return `Mañana · ${long}`;
  return capitalized(long);
}

export function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
