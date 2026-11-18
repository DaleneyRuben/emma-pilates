import type { PayStatementDto } from "@pilates/api-contracts";
import { boliviaParts } from "../../lib/bolivia-time";
import { formatBolivianos } from "../../lib/money";

const lower = (text: string) =>
  text.charAt(0).toLocaleLowerCase("es") + text.slice(1);

const changeOf = (
  before: PayStatementDto | undefined,
  after: PayStatementDto | undefined,
): string | null => {
  if (after === undefined) {
    return before === undefined
      ? null
      : `${before.staffMemberName} ya no tiene sueldo`;
  }
  if (before === undefined) {
    return `${after.staffMemberName}, nuevo: ${formatBolivianos(after.totalCentavos)}`;
  }
  if (before.totalCentavos === after.totalCentavos) return null;
  return `${after.staffMemberName} pasó de ${formatBolivianos(before.totalCentavos)} a ${formatBolivianos(after.totalCentavos)}`;
};

// Finding 105: «Volver a calcular» says when it ran and whose pay changed,
// comparing the statements shown before and after it.
export function recalculationSummary(
  periodLabel: string,
  before: PayStatementDto[],
  after: PayStatementDto[],
  now: Date = new Date(),
): string {
  const people = new Set(
    [...before, ...after].map((statement) => statement.staffMemberId),
  );
  const byPerson = (list: PayStatementDto[], id: string) =>
    list.find((statement) => statement.staffMemberId === id);
  const changes = [...people].flatMap((id) => {
    const change = changeOf(byPerson(before, id), byPerson(after, id));
    return change === null ? [] : [change];
  });
  const head = `Recalculamos ${lower(periodLabel)} a las ${boliviaParts(now).time}.`;
  if (changes.length === 0) return `${head} Ningún sueldo cambió.`;
  return `${head} Cambió ${changes.length} ${changes.length === 1 ? "sueldo" : "sueldos"}: ${changes.join("; ")}.`;
}
