import { formatMoney } from "@pilates/api-contracts";
import type { PayStatementLineDto } from "@pilates/api-contracts";
import { colors } from "@pilates/mobile-core";

type LineKind = PayStatementLineDto["kind"];

/** A concept's key, or «other» for a kind a newer API adds. */
export type PayGroupKey = LineKind | "other";

export type PayGroup = {
  key: PayGroupKey;
  label: string;
  /** Its share of the proportions bar and the dot on its row. */
  color: string;
  lines: PayStatementLineDto[];
  centavos: number;
  /** The row's quiet line: «54 × Bs 25», «2 clientas nuevas». */
  note: string | null;
};

// S29: the statement sums by concept in this order. E2 B names the Trainer's
// commission by what it pays for.
const concepts: { kind: LineKind; label: string; color: string }[] = [
  { kind: "class", label: "Clases dictadas", color: colors.emphasis },
  { kind: "minimum_not_met", label: "Canceladas por mínimo", color: colors.border },
  { kind: "commission", label: "Comisiones de primer plan", color: colors.primary },
  { kind: "base", label: "Base", color: colors.primaryTint },
  { kind: "new_client", label: "Clientas nuevas", color: colors.primary },
  { kind: "bonus", label: "Bono", color: colors.emphasis },
];

const known = new Set<string>(concepts.map((concept) => concept.kind));

const classKinds = new Set<PayGroupKey>(["class", "minimum_not_met"]);
const clientKinds = new Set<PayGroupKey>(["commission", "new_client"]);

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The one amount every line pays, when they all pay the same. */
function uniformAmount(lines: PayStatementLineDto[]): number | null {
  const [first] = lines;
  if (first === undefined) return null;
  return lines.every((line) => line.amountCentavos === first.amountCentavos)
    ? first.amountCentavos
    : null;
}

function noteOf(key: PayGroupKey, label: string, lines: PayStatementLineDto[]): string | null {
  const count = lines.length;
  if (clientKinds.has(key)) return plural(count, "clienta nueva", "clientas nuevas");
  const each = uniformAmount(lines);
  if (classKinds.has(key)) {
    return each === null ? plural(count, "clase", "clases") : `${count} × ${formatMoney(each)}`;
  }
  const [only] = lines;
  if (count === 1 && only !== undefined) return only.detail === label ? null : only.detail;
  return each === null ? null : `${count} × ${formatMoney(each)}`;
}

/** E2 B: the statement's lines by concept, only the concepts it has. */
export function payGroups(lines: PayStatementLineDto[]): PayGroup[] {
  const groups = [
    ...concepts.map(({ kind, label, color }) => ({
      key: kind as PayGroupKey,
      label,
      color,
      lines: lines.filter((line) => line.kind === kind),
    })),
    // A kind a newer API adds still counts, so the rows add up to the total.
    {
      key: "other" as const,
      label: "Otros",
      color: colors.iconQuiet,
      lines: lines.filter((line) => !known.has(line.kind)),
    },
  ];
  return groups.flatMap(({ key, label, color, lines: matching }) => {
    if (matching.length === 0) return [];
    const centavos = matching.reduce((total, line) => total + line.amountCentavos, 0);
    return [{ key, label, color, lines: matching, centavos, note: noteOf(key, label, matching) }];
  });
}

/**
 * E2 C: the sentence under a group's title, «54 clases × Bs 25 = Bs 1.350.»,
 * and why a class cancelled for its minimum still pays.
 */
export function groupSummary(group: PayGroup): string {
  const total = formatMoney(group.centavos);
  const count = group.lines.length;
  if (!classKinds.has(group.key)) return `${total} en total.`;
  const classes = plural(count, "clase", "clases");
  const each = uniformAmount(group.lines);
  const sum =
    each === null
      ? `${classes} · ${total} en total.`
      : `${classes} × ${formatMoney(each)} = ${total}.`;
  return group.key === "minimum_not_met"
    ? `${sum} Se te pagan aunque no se llegue al mínimo.`
    : sum;
}
