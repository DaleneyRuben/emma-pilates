/**
 * ADR-0057: the studio runs on `America/La_Paz` whatever zone the browser is
 * in. Civil dates are `YYYY-MM-DD` strings, wall clocks `HH:mm`, and exact
 * instants UTC ISO strings as the API exchanges them. The mobile apps keep
 * their own formatters in `@pilates/mobile-core`, which admin web cannot
 * import (React Native package).
 */
const timeZone = "America/La_Paz";

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const shortWeekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const longWeekdays = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];
const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

type BoliviaParts = {
  date: string;
  time: string;
  /** ISO weekday, Monday = 1. */
  weekday: number;
  /** Minutes since Bolivia midnight. */
  minutes: number;
};

export function boliviaParts(instant: string | Date): BoliviaParts {
  const parts = Object.fromEntries(
    partsFormat
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  const hours = Number(parts.hour);
  const minutes = Number(parts.minute);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: weekdays.indexOf(parts.weekday ?? "") + 1,
    minutes: hours * 60 + minutes,
  };
}

export const boliviaToday = (now: Date = new Date()): string =>
  boliviaParts(now).date;

const civilUtc = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

export function addDays(date: string, days: number): string {
  const next = civilUtc(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** ISO weekday (Monday = 1) of a civil date. */
export const weekdayOf = (date: string): number =>
  ((civilUtc(date).getUTCDay() + 6) % 7) + 1;

export const weekStartOf = (date: string): string =>
  addDays(date, 1 - weekdayOf(date));

/** The instant a Bolivia date and wall clock name, as a UTC ISO string. */
export function boliviaInstant(date: string, time: string): string {
  const guess = new Date(`${date}T${time}:00.000Z`);
  const seen = boliviaParts(guess);
  const seenAsUtc = new Date(`${seen.date}T${seen.time}:00.000Z`);
  const offset = seenAsUtc.getTime() - guess.getTime();
  return new Date(guess.getTime() - offset).toISOString();
}

const dayMonth = (date: string) => ({
  day: Number(date.slice(8, 10)),
  month: months[Number(date.slice(5, 7)) - 1] ?? "",
  year: date.slice(0, 4),
});

export function formatWeekRange(monday: string): string {
  const first = dayMonth(monday);
  const last = dayMonth(addDays(monday, 6));
  if (first.year !== last.year) {
    return `${first.day} de ${first.month} de ${first.year} – ${last.day} de ${last.month} de ${last.year}`;
  }
  if (first.month !== last.month) {
    return `${first.day} de ${first.month} – ${last.day} de ${last.month} de ${last.year}`;
  }
  return `${first.day} – ${last.day} de ${last.month} de ${last.year}`;
}

export const formatDayTab = (date: string) => ({
  weekday: shortWeekdays[weekdayOf(date) - 1],
  day: String(Number(date.slice(8, 10))),
});

/** "jueves" for ISO weekday 4 (Monday = 1). */
export const weekdayName = (weekday: number): string =>
  longWeekdays[weekday - 1] ?? "";

/** "jueves 13 de agosto", as a screen reader hears an AW02 slot's day. */
export function formatLongDay(date: string): string {
  const { day, month } = dayMonth(date);
  return `${weekdayName(weekdayOf(date))} ${day} de ${month}`;
}

export function formatSessionMoment(instant: string): string {
  const parts = boliviaParts(instant);
  const { day, month } = dayMonth(parts.date);
  return `${shortWeekdays[parts.weekday - 1]} ${day} ${month.slice(0, 3)} · ${parts.time}`;
}

/** `dd/mm/aaaa`, the design system's date format. */
export const formatCivilDate = (date: string): string =>
  `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;

/** `dd/mm/aaaa · hh:mm` in Bolivia time, e.g. when a Payment was sent. */
export function formatCivilMoment(instant: string): string {
  const parts = boliviaParts(instant);
  return `${formatCivilDate(parts.date)} · ${parts.time}`;
}

/** "lun 21/09 · 09:00": a moment inside a week already on screen (AW25). */
export function formatWeekdayMoment(instant: string): string {
  const parts = boliviaParts(instant);
  const weekday = (shortWeekdays[parts.weekday - 1] ?? "").toLocaleLowerCase(
    "es",
  );
  return `${weekday} ${parts.date.slice(8, 10)}/${parts.date.slice(5, 7)} · ${parts.time}`;
}

/** "vie 23/10": a civil day inside a month already on screen (AW151). */
export function formatWeekdayDay(date: string): string {
  const weekday = (shortWeekdays[weekdayOf(date) - 1] ?? "").toLocaleLowerCase(
    "es",
  );
  return `${weekday} ${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** The Bolivia month `YYYY-MM` an instant falls in. */
export const boliviaMonth = (now: Date = new Date()): string =>
  boliviaParts(now).date.slice(0, 7);

export function addMonths(month: string, count: number): string {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;
  const next = index + count;
  return `${Math.floor(next / 12)}-${String((next % 12) + 1).padStart(2, "0")}`;
}

/** "agosto de 2026", as AW31 names the month. */
export const formatMonth = (month: string): string =>
  `${months[Number(month.slice(5, 7)) - 1] ?? ""} de ${month.slice(0, 4)}`;
