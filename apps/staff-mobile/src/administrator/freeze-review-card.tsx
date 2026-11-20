import type { FreezeReviewDto } from "@pilates/api-contracts";
import { ClientFace, colors, radii, spacing, surfaces, Text } from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

import { freezePlanEndRow, freezeRequestLine } from "./freeze-format";

/**
 * E9 A (owner 2026-11-19): the Client with her photo or initials, what she
 * asks for with the days counted, then Plan / Vencería / Motivo as a table,
 * and the refusal reason once refused. Board E-D09: the name is the card's
 * title (`titulo-bloque`), the table keys `compacto`, its values `titulo-fila`.
 */
export function FreezeReviewCard({
  fetcher,
  freeze,
}: {
  fetcher: typeof globalThis.fetch;
  freeze: FreezeReviewDto;
}) {
  const planEnd = freezePlanEndRow(freeze);
  const rows = [
    { label: "Plan", value: freeze.planName },
    ...(planEnd === undefined ? [] : [planEnd]),
    { label: "Motivo", value: freeze.reason },
    // FIX-091 stores why a freeze was refused; E9 says it on a refused one.
    ...(freeze.state === "refused" && freeze.refusalReason
      ? [{ label: "Motivo del rechazo", value: freeze.refusalReason }]
      : []),
  ];
  return (
    <View style={styles.card} testID="freeze-review-card">
      <View style={styles.identity}>
        <ClientFace
          fetcher={fetcher}
          name={freeze.clientName}
          photo={freeze.clientPhoto}
          size={40}
        />
        <Text style={styles.name} variant="titulo-bloque">
          {freeze.clientName}
        </Text>
      </View>
      <Text variant="cuerpo">{freezeRequestLine(freeze)}</Text>
      <View style={styles.table}>
        {rows.map((row, index) => (
          <View
            accessibilityLabel={`${row.label}: ${row.value}`}
            accessible
            key={row.label}
            style={[styles.row, index > 0 && styles.divided]}
          >
            <Text variant="compacto">{row.label}</Text>
            <Text style={styles.value} variant="titulo-fila">
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  divided: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  identity: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  name: { flex: 1 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smLg,
  },
  // E-D09: the table's 1 pt 200 rule, its rows split by 100 hairlines.
  table: {
    borderColor: colors.borderSoft,
    borderRadius: radii.inset,
    borderWidth: 1,
  },
  value: { flexShrink: 1, textAlign: "right" },
});
