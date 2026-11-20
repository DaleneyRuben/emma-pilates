import type { PayStatementLineDto } from "@pilates/api-contracts";

export type DatedPayLine = {
  time: string;
  classType: string;
  branch: string;
  /** What else the line says, such as «6 clientas, 2 extra». */
  extra: string | null;
  amountCentavos: number;
};

export type PayDay = {
  /** «lunes 2 nov», drawn in capitals as a section title. */
  title: string;
  lines: DatedPayLine[];
  centavos: number;
};

export type UndatedPayLine = { title: string; note: string | null; amountCentavos: number };

const weekdays: Record<string, string> = {
  dom: "domingo",
  lun: "lunes",
  mar: "martes",
  mié: "miércoles",
  jue: "jueves",
  vie: "viernes",
  sáb: "sábado",
};

// The backend's snapshot of a class line (pay-line-detail.ts):
// «lun 2 nov · 08:00 · Achumani · Reformer», then « · 4 clientas» when taught.
const classDetail =
  /^(dom|lun|mar|mié|jue|vie|sáb) (\d{1,2} [a-z]{3}) · (\d{2}:\d{2}) · ([^·]+) · ([^·]+?)(?: · (.+))?$/;

/**
 * E2 C: a group's lines by day, in the statement's order, with each day's
 * count and sum. A line whose text names no class (a commission, or a
 * statement drafted before lines carried the class) stays undated.
 */
export function linesByDay(lines: PayStatementLineDto[]): {
  days: PayDay[];
  undated: UndatedPayLine[];
} {
  const days: PayDay[] = [];
  const undated: UndatedPayLine[] = [];
  for (const line of lines) {
    const match = classDetail.exec(line.detail);
    if (match === null) {
      const [title = line.detail, ...rest] = line.detail.split(" · ");
      undated.push({
        title,
        note: rest.length === 0 ? null : rest.join(" · "),
        amountCentavos: line.amountCentavos,
      });
      continue;
    }
    const [, weekday = "", date = "", time = "", branch = "", classType = "", extra] = match;
    const title = `${weekdays[weekday] ?? weekday} ${date}`;
    let day = days.find((candidate) => candidate.title === title);
    if (day === undefined) {
      day = { title, lines: [], centavos: 0 };
      days.push(day);
    }
    day.lines.push({
      time,
      classType: classType.trim(),
      branch: branch.trim(),
      extra: extra ?? null,
      amountCentavos: line.amountCentavos,
    });
    day.centavos += line.amountCentavos;
  }
  return { days, undated };
}
