import { addMonths } from "../lib/bolivia-time";

type MonthTotal = { month: string; totalCentavos: number };

export type ReportMonth = {
  /** `YYYY-MM`, a Bolivia month. */
  month: string;
  incomeCentavos: number;
  expensesCentavos: number;
  netCentavos: number;
};

/** AW16 opens on the last six Bolivia months, today included. */
export const defaultReportRange = (today: string) => ({
  from: `${addMonths(today.slice(0, 7), -5)}-01`,
  to: today,
});

/** Every Bolivia month from `from` to `to` (civil dates), empty ones too. */
export function reportMonths(from: string, to: string): string[] {
  const months: string[] = [];
  for (
    let month = from.slice(0, 7);
    month <= to.slice(0, 7);
    month = addMonths(month, 1)
  ) {
    months.push(month);
  }
  return months;
}

// Both reports key a month by its first day (`YYYY-MM-01`).
const byMonth = (totals: readonly MonthTotal[]) =>
  new Map(
    totals.map((total) => [total.month.slice(0, 7), total.totalCentavos]),
  );

export function monthTotals(
  months: readonly string[],
  income: readonly MonthTotal[],
  expenses: readonly MonthTotal[],
): ReportMonth[] {
  const incomeOf = byMonth(income);
  const expensesOf = byMonth(expenses);
  return months.map((month) => {
    const incomeCentavos = incomeOf.get(month) ?? 0;
    const expensesCentavos = expensesOf.get(month) ?? 0;
    return {
      month,
      incomeCentavos,
      expensesCentavos,
      netCentavos: incomeCentavos - expensesCentavos,
    };
  });
}

const niceSteps = [1, 2, 2.5, 5, 10];

/**
 * The chart's linear scale: the largest bar rounded up to 1, 2, 2.5, or 5
 * times a power of ten, in whole bolivianos, with reference lines at zero,
 * half, and the top (design README, AW16: three gridlines).
 */
export function chartScale(maxCentavos: number) {
  const bolivianos = Math.max(maxCentavos / 100, 1_000);
  const power = 10 ** Math.floor(Math.log10(bolivianos));
  const step =
    niceSteps.find((candidate) => candidate * power >= bolivianos) ?? 10;
  const topCentavos = step * power * 100;
  return {
    topCentavos,
    ticksCentavos: [0, topCentavos / 2, topCentavos],
  };
}
