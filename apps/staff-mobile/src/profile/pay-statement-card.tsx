import type { PayStatementDto, PayStatementLineDto } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  formatMonthHeading,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

function summarize(lines: PayStatementLineDto[]) {
  return concepts.flatMap(({ kind, summary }) => {
    const matching = lines.filter((line) => line.kind === kind);
    if (matching.length === 0) return [];
    const centavos = matching.reduce((total, line) => total + line.amountCentavos, 0);
    return [{ kind, label: `${summary} · ${matching.length}`, centavos }];
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

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={styles.textButton}
    >
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function PayStatementCard({ statement }: { statement: PayStatementDto }) {
  const [open, setOpen] = useState(false);
  const heading = monthHeading(statement.month);
  const approved = statement.state === "approved";
  return (
    <View accessibilityLabel={`Liquidación de ${heading.toLowerCase()}`} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.title}>
          <Text numberOfLines={1} style={styles.month}>
            {heading}
          </Text>
          <View style={[styles.state, approved ? styles.approved : styles.draft]}>
            <Text style={approved ? styles.approvedText : styles.draftText}>
              {approved ? "Aprobado" : "Borrador"}
            </Text>
          </View>
        </View>
        <Text style={styles.total}>{formatExactBolivianos(statement.totalCentavos)}</Text>
      </View>
      {approved ? null : (
        <Text style={styles.note}>Puede cambiar hasta que administración lo apruebe.</Text>
      )}
      <View style={styles.rows}>
        {summarize(statement.lines).map((concept) => (
          <AmountRow centavos={concept.centavos} key={concept.kind} label={concept.label} />
        ))}
      </View>
      {open ? (
        <>
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
          <TextButton label="Ocultar detalle" onPress={() => setOpen(false)} />
        </>
      ) : (
        <TextButton label="Ver cada clase" onPress={() => setOpen(true)} />
      )}
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
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
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
  lines: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: spacing.md },
  month: { color: colors.text, fontFamily: fontFamilies.heading, fontSize: typography.titleSmall },
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
  textButton: { alignSelf: "flex-start", paddingVertical: spacing.xxs },
  textButtonLabel: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
  },
  title: { alignItems: "flex-start", flexShrink: 1, gap: 6 },
  total: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.titleSecondary,
    fontVariant: ["tabular-nums"],
  },
});
