import { formatListDate } from "@pilates/api-contracts";
import { formatMonthHeading } from "@pilates/mobile-core";

const civilUtc = (date: string) => new Date(`${date}T00:00:00.000Z`);

/**
 * BKO-009: how S29 names a statement. A whole month keeps its heading
 * («Octubre 2026»); a day or any other period names its days, the last one
 * included, since the API's period end is exclusive.
 */
export function payPeriodHeading(statement: { periodStart: string; periodEnd: string }): {
  heading: string;
  label: string;
} {
  const start = civilUtc(statement.periodStart);
  const end = civilUtc(statement.periodEnd);
  const wholeMonth =
    start.getUTCDate() === 1 &&
    end.getTime() === Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
  if (wholeMonth) {
    // Noon in Bolivia keeps the civil date in its month.
    const heading = formatMonthHeading(`${statement.periodStart}T12:00:00-04:00`);
    return { heading, label: `Liquidación de ${heading.toLowerCase()}` };
  }
  // FIX-090: the days in the shared list format, «lun 26 oct – dom 1 nov».
  const first = statement.periodStart;
  const last = new Date(end.getTime() - 24 * 60 * 60 * 1_000).toISOString().slice(0, 10);
  const heading =
    first === last ? formatListDate(first) : `${formatListDate(first)} – ${formatListDate(last)}`;
  return { heading, label: `Liquidación del ${heading}` };
}
