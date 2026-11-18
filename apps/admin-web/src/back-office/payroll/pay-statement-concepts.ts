import type { PayStatementLineDto } from "@pilates/api-contracts";
import { formatBolivianos } from "../../lib/money";

type LineKind = PayStatementLineDto["kind"];

export type PayConcept = {
  key: string;
  label: string;
  rate: string;
  subtotalCentavos: number;
  lines: PayStatementLineDto[];
};

// Finding 105: the staff app's order and names (S29), so both read alike.
const concepts: { kind: LineKind; label: string }[] = [
  { kind: "class", label: "Clases dictadas" },
  { kind: "minimum_not_met", label: "Canceladas por mínimo" },
  { kind: "commission", label: "Comisiones de primer plan" },
  { kind: "base", label: "Base" },
  { kind: "new_client", label: "Clientas nuevas" },
  { kind: "bonus", label: "Bono de renovación" },
];

const known = new Set<string>(concepts.map((concept) => concept.kind));

// «54 × Bs 25,00», or each amount with its count when they differ. A
// commission is a percentage of each Plan, so it only counts them.
const rateOf = (kind: string, lines: PayStatementLineDto[]): string => {
  if (kind === "commission") {
    return `${lines.length} ${lines.length === 1 ? "comisión" : "comisiones"}`;
  }
  const counts = new Map<number, number>();
  for (const line of lines) {
    counts.set(line.amountCentavos, (counts.get(line.amountCentavos) ?? 0) + 1);
  }
  return [...counts]
    .sort(([a], [b]) => a - b)
    .map(([amount, count]) => `${count} × ${formatBolivianos(amount)}`)
    .join(" · ");
};

// A kind a newer API adds still counts, under «Otros», so the groups add up to
// the total.
export function conceptsOf(lines: PayStatementLineDto[]): PayConcept[] {
  return [
    ...concepts.map(({ kind, label }) => ({
      key: kind as string,
      label,
      lines: lines.filter((line) => line.kind === kind),
    })),
    {
      key: "other",
      label: "Otros",
      lines: lines.filter((line) => !known.has(line.kind)),
    },
  ].flatMap((group) =>
    group.lines.length === 0
      ? []
      : [
          {
            ...group,
            rate: rateOf(group.key, group.lines),
            subtotalCentavos: group.lines.reduce(
              (total, line) => total + line.amountCentavos,
              0,
            ),
          },
        ],
  );
}
