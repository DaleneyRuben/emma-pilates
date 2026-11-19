// FIX-090 (owner 2026-11-19, `DECISIONES-AUDITORIA-2026-11-19.md`): the one
// way money, dates and places read on every screen of the admin web and both
// apps. CSV exports keep their own machine formats.

const timeZone = "America/La_Paz";
const weekdays = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const shortWeekdays = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
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
const shortMonths = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sept",
  "oct",
  "nov",
  "dic",
];

const parts = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  timeZone,
  year: "numeric",
});

type Civil = { year: number; month: number; day: number; weekday: number };

/** A civil date «2026-11-19» or an instant, read on the La Paz calendar. */
export type DateInput = string | Date;

function civil(input: DateInput): Civil & { time: string | null } {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return { day, month, time: null, weekday, year };
  }
  const instant = typeof input === "string" ? new Date(input) : input;
  const read = Object.fromEntries(
    parts.formatToParts(instant).map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  const year = Number(read.year);
  const month = Number(read.month);
  const day = Number(read.day);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { day, month, time: `${read.hour}:${read.minute}`, weekday, year };
}

/** «jue 19 nov»: dates in lists and rows. */
export function formatListDate(input: DateInput): string {
  const date = civil(input);
  return `${shortWeekdays[date.weekday]} ${date.day} ${shortMonths[date.month - 1]}`;
}

/** «Jueves 19 de noviembre»: dates in titles. */
export function formatTitleDate(input: DateInput): string {
  const date = civil(input);
  const weekday = weekdays[date.weekday] ?? "";
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.day} de ${months[date.month - 1]}`;
}

/** «jue 19 nov · 08:00»: an instant with its La Paz time. */
export function formatDateTime(input: DateInput): string {
  const date = civil(input);
  return date.time === null
    ? formatListDate(input)
    : `${formatListDate(input)} · ${date.time}`;
}

const withDecimals = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  useGrouping: "always",
});
const whole = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 0,
  useGrouping: "always",
});

/** «Bs 1.534,90», and «Bs 450» when the decimals are ,00. Amounts are centavos. */
export function formatMoney(centavos: number): string {
  const absolute = Math.abs(Math.round(centavos));
  const text =
    absolute % 100 === 0
      ? whole.format(absolute / 100)
      : withDecimals.format(absolute / 100);
  return `${centavos < 0 ? "−" : ""}Bs ${text}`;
}

/** «4 de 8 lugares». */
export function capacityLabel(booked: number, capacity: number): string {
  return `${booked} de ${capacity} ${capacity === 1 ? "lugar" : "lugares"}`;
}
