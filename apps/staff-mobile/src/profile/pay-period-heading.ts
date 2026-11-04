import { formatMonthHeading } from "@pilates/mobile-core";

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

const civilUtc = (date: string) => new Date(`${date}T00:00:00.000Z`);

const parts = (date: Date) => ({
  day: date.getUTCDate(),
  month: months[date.getUTCMonth()] ?? "",
  year: date.getUTCFullYear(),
});

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
  const first = parts(start);
  const last = parts(new Date(end.getTime() - 24 * 60 * 60 * 1_000));
  let heading: string;
  if (first.year !== last.year) {
    heading = `${first.day} de ${first.month} de ${first.year} – ${last.day} de ${last.month} de ${last.year}`;
  } else if (first.month !== last.month) {
    heading = `${first.day} de ${first.month} – ${last.day} de ${last.month} de ${last.year}`;
  } else if (first.day !== last.day) {
    heading = `${first.day} – ${last.day} de ${last.month} de ${last.year}`;
  } else {
    heading = `${first.day} de ${first.month} de ${first.year}`;
  }
  return { heading, label: `Liquidación del ${heading}` };
}
