import { parseCivilDate } from "../../components/form/civil-date";
import {
  addDays,
  addMonths,
  boliviaMonth,
  boliviaToday,
  formatCivilDate,
  formatLongDay,
  formatMonth,
  formatWeekRange,
  weekStartOf,
} from "../../lib/bolivia-time";

/**
 * BKO-009: Sueldos › Por aprobar shows one period. Mes keeps the address it
 * always had (`?month=`); Día and Semana add `period` and `date`, Rango adds
 * `from` and `to`, both days included.
 */
export type PayPeriodKind = "day" | "week" | "range" | "month";

export type PayStatementsSearch = {
  month: string;
  period?: "day" | "week" | "range";
  date?: string;
  from?: string;
  to?: string;
};

/** What the API is asked for: a month, or [from, until) with until exclusive. */
export type PayPeriodQuery =
  { month: string } | { from: string; until: string };

export type PayWindow = {
  kind: PayPeriodKind;
  label: string;
  query: PayPeriodQuery | null;
};

const text = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const civil = (value: unknown): string | undefined => {
  const date = text(value);
  return date !== undefined && parseCivilDate(date) === date ? date : undefined;
};

const capitalized = (label: string) =>
  label.charAt(0).toLocaleUpperCase("es") + label.slice(1);

export function validatePayStatementsSearch(
  search: Record<string, unknown>,
): PayStatementsSearch {
  const month = text(search.month);
  const period = text(search.period);
  return {
    month:
      month !== undefined && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
        ? month
        : boliviaMonth(),
    period:
      period === "day" || period === "week" || period === "range"
        ? period
        : undefined,
    date: civil(search.date),
    from: civil(search.from),
    to: civil(search.to),
  };
}

const lastDayOf = (month: string) => addDays(`${addMonths(month, 1)}-01`, -1);

/** The day, the week's Monday, or the range the search names, with defaults. */
export function windowOf(
  search: PayStatementsSearch,
  today: string = boliviaToday(),
): PayWindow & { date: string; from: string; to: string } {
  const date = search.date ?? today;
  const from = search.from ?? `${search.month}-01`;
  const to = search.to ?? lastDayOf(search.month);
  const shared = { date, from, to };
  if (search.period === "day") {
    return {
      ...shared,
      kind: "day",
      label: `${capitalized(formatLongDay(date))} de ${date.slice(0, 4)}`,
      query: { from: date, until: addDays(date, 1) },
    };
  }
  if (search.period === "week") {
    const monday = weekStartOf(date);
    return {
      ...shared,
      date: monday,
      kind: "week",
      label: `Semana del ${formatWeekRange(monday)}`,
      query: { from: monday, until: addDays(monday, 7) },
    };
  }
  if (search.period === "range") {
    return {
      ...shared,
      kind: "range",
      label: `Del ${formatCivilDate(from)} al ${formatCivilDate(to)}`,
      query: to < from ? null : { from, until: addDays(to, 1) },
    };
  }
  return {
    ...shared,
    kind: "month",
    label: capitalized(formatMonth(search.month)),
    query: { month: search.month },
  };
}

/** The search for another kind of period, starting where the current one does. */
export function searchFor(
  kind: PayPeriodKind,
  current: PayStatementsSearch,
  today: string = boliviaToday(),
): PayStatementsSearch {
  const shown = windowOf(current, today);
  const start =
    shown.kind === "range"
      ? shown.from
      : shown.kind === "month"
        ? `${current.month}-01`
        : shown.date;
  const month = start.slice(0, 7);
  if (kind === "month") return { month };
  if (kind === "range") {
    return { month, period: "range", from: shown.from, to: shown.to };
  }
  const date =
    current.month === boliviaMonth() && !current.period ? today : start;
  return { month: date.slice(0, 7), period: kind, date };
}

/** How a statement names its own period: a month, a day, or both ends. */
export function formatPayPeriod(
  periodStart: string,
  periodEnd: string,
): string {
  const last = addDays(periodEnd, -1);
  if (
    periodStart.endsWith("-01") &&
    periodEnd === `${addMonths(periodStart.slice(0, 7), 1)}-01`
  ) {
    return capitalized(formatMonth(periodStart.slice(0, 7)));
  }
  if (last === periodStart) return formatCivilDate(periodStart);
  return `Del ${formatCivilDate(periodStart)} al ${formatCivilDate(last)}`;
}
