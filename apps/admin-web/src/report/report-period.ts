import { addDays, addMonths, monthName } from "../lib/bolivia-time";
import type { ReportRange } from "./report-search";

/**
 * FIX-091 (W5 B): the chips that choose AW16's period. Each one is a range
 * of whole Bolivia months that ends today; «Elegir fechas» opens the Desde
 * and Hasta fields for any other range.
 */
export type ReportPeriod = "month" | "quarter" | "half";

const monthsBack: Record<ReportPeriod, number> = {
  month: 0,
  quarter: 2,
  half: 5,
};

export const periodRange = (
  period: ReportPeriod,
  today: string,
): ReportRange => ({
  from: `${addMonths(today.slice(0, 7), -monthsBack[period])}-01`,
  to: today,
});

/** The chip a range is, or `undefined` for a range only the fields name. */
export function periodOf(
  range: ReportRange,
  today: string,
): ReportPeriod | undefined {
  if (range.to !== today) return undefined;
  return (Object.keys(monthsBack) as ReportPeriod[]).find(
    (period) => periodRange(period, today).from === range.from,
  );
}

export type ComparedMonth = ReportRange & {
  /** `YYYY-MM`, a Bolivia month. */
  month: string;
};

/**
 * «Mes contra mes»: the month the range ends in, up to its last day, against
 * the whole month before it.
 */
export function comparedMonths(to: string): {
  current: ComparedMonth;
  previous: ComparedMonth;
} {
  const month = to.slice(0, 7);
  const previous = addMonths(month, -1);
  return {
    current: { month, from: `${month}-01`, to },
    previous: {
      month: previous,
      from: `${previous}-01`,
      to: addDays(`${month}-01`, -1),
    },
  };
}

/** «+12 % que octubre» under Entró; nothing when the month before had none. */
export function changeLine(
  currentCentavos: number,
  previousCentavos: number,
  previousMonth: string,
): string | null {
  if (previousCentavos === 0) return null;
  const name = monthName(previousMonth);
  const percent = Math.round(
    ((currentCentavos - previousCentavos) / previousCentavos) * 100,
  );
  if (percent === 0) return `Igual que ${name}`;
  return `${percent > 0 ? "+" : "−"}${Math.abs(percent)} % que ${name}`;
}
