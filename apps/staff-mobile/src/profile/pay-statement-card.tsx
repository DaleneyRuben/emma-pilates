import type { PayStatementDto, PayStatementLineDto } from "@pilates/api-contracts";
import {
  CardActionRow,
  cardWithActionRow,
  colors,
  EmphasisCard,
  fontFamilies,
  formatMonthHeading,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatExactBolivianos } from "../ui/exact-bolivianos";

type LineKind = PayStatementLineDto["kind"];

// S29: the card sums by concept in this order; each line keeps its own label.
const concepts: { kind: LineKind; summary: string; line: string }[] = [
  { kind: "class", summary: "Clases dictadas", line: "Clase" },
  { kind: "minimum_not_met", summary: "Canceladas por mínimo", line: "Clase cancelada por mínimo" },
  { kind: "commission", summary: "Comisiones", line: "Comisión" },
  { kind: "base", summary: "Base", line: "Base" },
  { kind: "new_client", summary: "Clientas nuevas", line: "Clienta nueva" },
  { kind: "bonus", summary: "Bono", line: "Bono" },
];

const lineLabel = (kind: LineKind) => concepts.find((concept) => concept.kind === kind)?.line;

const known = new Set<string>(concepts.map((concept) => concept.kind));

// A kind a newer API adds still counts, under «Otros», so the rows add up to
// the total.
function summarize(lines: PayStatementLineDto[]) {
  const groups = [
    ...concepts.map(({ kind, summary }) => ({
      key: kind,
      summary,
      lines: lines.filter((line) => line.kind === kind),
    })),
    { key: "other", summary: "Otros", lines: lines.filter((line) => !known.has(line.kind)) },
  ];
  return groups.flatMap(({ key, summary, lines: matching }) => {
    if (matching.length === 0) return [];
    const centavos = matching.reduce((total, line) => total + line.amountCentavos, 0);
    return [{ key, label: `${summary} · ${matching.length}`, centavos }];
  });
}

// The statement's month is a civil date; noon in Bolivia keeps it in its month.
function monthHeading(month: string): string {
  return formatMonthHeading(`${month}T12:00:00-04:00`);
}

function AmountRow({
  label,
  detail,
  centavos,
}: {
  label: string;
  detail?: string;
  centavos: number;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail === undefined ? null : <Text style={styles.detail}>{detail}</Text>}
      </View>
      <Text style={styles.amount}>{formatExactBolivianos(centavos)}</Text>
    </View>
  );
}

/** S29's hero: the month still open, on Rosa profundo (follow-up 225 §5). */
export function DraftStatementCard({ statement }: { statement: PayStatementDto }) {
  const heading = monthHeading(statement.month);
  const classes = statement.lines.filter((line) => line.kind === "class").length;
  return (
    <View accessibilityLabel={`Liquidación de ${heading.toLowerCase()}`}>
      <EmphasisCard
        eyebrow={heading}
        note={`${classes} ${classes === 1 ? "clase dictada" : "clases dictadas"} · puede cambiar hasta que administración lo apruebe.`}
        pill="Borrador"
        testID="pay-draft-card"
      >
        <Text style={styles.heroTotal}>{formatExactBolivianos(statement.totalCentavos)}</Text>
      </EmphasisCard>
    </View>
  );
}

export function PayStatementCard({ statement }: { statement: PayStatementDto }) {
  const [open, setOpen] = useState(false);
  const heading = monthHeading(statement.month);
  const approved = statement.state === "approved";
  return (
    <View accessibilityLabel={`Liquidación de ${heading.toLowerCase()}`} style={styles.card}>
      <View style={styles.header}>
        <Text numberOfLines={1} style={styles.month}>
          {heading}
        </Text>
        <View style={[styles.state, approved ? styles.approved : styles.draft]}>
          <Text style={approved ? styles.approvedText : styles.draftText}>
            {approved ? "Aprobado" : "Borrador"}
          </Text>
        </View>
      </View>
      {approved ? null : (
        <Text style={styles.note}>Puede cambiar hasta que administración lo apruebe.</Text>
      )}
      <View style={styles.rows}>
        {summarize(statement.lines).map((concept) => (
          <AmountRow centavos={concept.centavos} key={concept.key} label={concept.label} />
        ))}
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{formatExactBolivianos(statement.totalCentavos)}</Text>
        </View>
      </View>
      {open ? (
        <View style={[styles.rows, styles.lines]}>
          {statement.lines.map((line, index) => (
            // Lines have no identity of their own; their order is the statement's.
            <AmountRow
              centavos={line.amountCentavos}
              detail={line.detail}
              key={index}
              label={lineLabel(line.kind) ?? line.kind}
            />
          ))}
        </View>
      ) : null}
      <CardActionRow
        label={open ? "Ocultar detalle" : "Ver cada clase"}
        onPress={() => setOpen((current) => !current)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
  },
  approved: { backgroundColor: colors.successTint },
  approvedText: {
    color: colors.successText,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.note,
  },
  card: { ...surfaces.card, ...cardWithActionRow, gap: spacing.md, padding: spacing.lg },
  detail: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  draft: { backgroundColor: colors.warningTint },
  draftText: {
    color: colors.warningText,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.note,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  lines: { borderTopColor: colors.hairline, borderTopWidth: 1, paddingTop: spacing.md },
  month: { color: colors.text, flexShrink: 1, fontFamily: fontFamilies.display, fontSize: 20 },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  rowBody: { flexShrink: 1, gap: 2 },
  rowLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  rows: { gap: spacing.sm },
  state: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  heroTotal: {
    color: colors.white,
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
  },
  totalLabel: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 16 },
  totalRow: { borderTopColor: colors.hairline, borderTopWidth: 1, paddingTop: spacing.sm },
  total: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
  },
});
