import { parseCivilMonth } from '../civil-month';

// BKO-009 (ADR-0109): a Pay Statement covers [from, until), Bolivia civil
// dates at UTC midnight (ADR-0057), the end exclusive.
export type PayPeriod = { from: Date; until: Date };

const dayMilliseconds = 24 * 60 * 60 * 1_000;
const longestPeriodDays = 366;

export const civilText = (date: Date): string =>
  date.toISOString().slice(0, 10);

export const monthPeriod = (month: Date): PayPeriod => ({
  from: new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1)),
  until: new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)),
});

export const monthOf = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

export const isWholeMonth = (period: PayPeriod): boolean => {
  const month = monthPeriod(period.from);
  return (
    month.from.getTime() === period.from.getTime() &&
    month.until.getTime() === period.until.getTime()
  );
};

const parseCivilDate = (text: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || civilText(date) !== text ? null : date;
};

// A query names a month («2026-11», as the released clients send it) or two
// civil dates; anything else, both at once, an empty or reversed period, or
// one longer than a year is null so the controller answers 400.
export const parsePayPeriod = (query: {
  month?: string;
  from?: string;
  until?: string;
}): PayPeriod | null => {
  if (query.month !== undefined) {
    if (query.from !== undefined || query.until !== undefined) return null;
    const month = parseCivilMonth(query.month);
    return month === null ? null : monthPeriod(month);
  }
  if (query.from === undefined || query.until === undefined) return null;
  const from = parseCivilDate(query.from);
  const until = parseCivilDate(query.until);
  if (from === null || until === null) return null;
  const days = (until.getTime() - from.getTime()) / dayMilliseconds;
  return days >= 1 && days <= longestPeriodDays ? { from, until } : null;
};
