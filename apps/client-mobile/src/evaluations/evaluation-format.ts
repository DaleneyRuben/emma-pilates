const timeZone = "America/La_Paz";

const clockFormatter = new Intl.DateTimeFormat("es-BO", {
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  timeZone,
});
const longDateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone,
  weekday: "long",
});
const dayMonthFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  timeZone,
});
const shortMonthFormatter = new Intl.DateTimeFormat("es-BO", {
  month: "short",
  timeZone,
});
const dayNumberFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  timeZone,
});
// Months are first-day civil dates; format them at UTC noon so no zone
// shifts them into the previous month.
const monthNameFormatter = new Intl.DateTimeFormat("es-BO", {
  month: "long",
  timeZone: "UTC",
});

const capitalized = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

// "09:45" in Bolivia time.
export function clockTime(instant: string): string {
  return clockFormatter.format(new Date(instant));
}

// "Lunes 24 de agosto".
export function evaluationDate(instant: string): string {
  return capitalized(longDateFormatter.format(new Date(instant)).replace(",", ""));
}

// "6 de agosto, 09:30".
export function evaluationDayAndTime(instant: string): string {
  return `${dayMonthFormatter.format(new Date(instant))}, ${clockTime(instant)}`;
}

// Calendar badge parts: "24" and "Ago".
export function evaluationBadge(instant: string): { day: string; month: string } {
  const month = shortMonthFormatter.format(new Date(instant)).replace(".", "");
  return {
    day: dayNumberFormatter.format(new Date(instant)),
    month: capitalized(month),
  };
}

// "octubre" for "2026-10-01".
export function monthName(month: string): string {
  return monthNameFormatter.format(new Date(`${month}T12:00:00.000Z`));
}

// The first-day civil date of the month after the given one.
export function followingMonth(month: string): string {
  const date = new Date(`${month}T12:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 1);
  return date.toISOString().slice(0, 10);
}
