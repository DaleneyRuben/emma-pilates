import type { PayStatementDto } from "@pilates/api-contracts";
import { boliviaParts } from "../../lib/bolivia-time";
import { formatBolivianos } from "../../lib/money";

const lower = (text: string) =>
  text.charAt(0).toLocaleLowerCase("es") + text.slice(1);

type Owed = { name: string; totalCentavos: number };

// A person can hold several statements in the window (two week drafts that a
// month draft replaces), so what each is owed adds up her statements.
const owedByPerson = (statements: PayStatementDto[]): Map<string, Owed> => {
  const owed = new Map<string, Owed>();
  for (const statement of statements) {
    const current = owed.get(statement.staffMemberId);
    owed.set(statement.staffMemberId, {
      name: statement.staffMemberName,
      totalCentavos: (current?.totalCentavos ?? 0) + statement.totalCentavos,
    });
  }
  return owed;
};

const changeOf = (
  before: Owed | undefined,
  after: Owed | undefined,
): string | null => {
  if (after === undefined) {
    return before === undefined ? null : `${before.name} ya no tiene sueldo`;
  }
  if (before === undefined) {
    return `${after.name}, nuevo: ${formatBolivianos(after.totalCentavos)}`;
  }
  if (before.totalCentavos === after.totalCentavos) return null;
  return `${after.name} pasó de ${formatBolivianos(before.totalCentavos)} a ${formatBolivianos(after.totalCentavos)}`;
};

// Finding 105: «Volver a calcular» says when it ran and whose pay changed,
// comparing the statements shown before and after it.
export function recalculationSummary(
  periodLabel: string,
  before: PayStatementDto[],
  after: PayStatementDto[],
  now: Date = new Date(),
): string {
  const owedBefore = owedByPerson(before);
  const owedAfter = owedByPerson(after);
  const people = new Set([...owedBefore.keys(), ...owedAfter.keys()]);
  const changes = [...people].flatMap((id) => {
    const change = changeOf(owedBefore.get(id), owedAfter.get(id));
    return change === null ? [] : [change];
  });
  const head = `Recalculamos ${lower(periodLabel)} a las ${boliviaParts(now).time}.`;
  if (changes.length === 0) return `${head} Ningún sueldo cambió.`;
  return `${head} Cambió ${changes.length} ${changes.length === 1 ? "sueldo" : "sueldos"}: ${changes.join("; ")}.`;
}
