import type { FreezeReviewDto } from "@pilates/api-contracts";
import {
  ClientFace,
  colors,
  fontFamilies,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { freezePlanEndRow, freezeRequestLine } from "./freeze-format";

/**
 * E9 A (owner 2026-11-19): the Client with her photo or initials, what she
 * asks for with the days counted, then Plan / Vencería / Motivo as a table,
 * and the refusal reason once refused.
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
        <Text style={styles.name}>{freeze.clientName}</Text>
      </View>
      <Text style={styles.request}>{freezeRequestLine(freeze)}</Text>
      <View style={styles.table}>
        {rows.map((row, index) => (
          <View
            accessibilityLabel={`${row.label}: ${row.value}`}
            accessible
            key={row.label}
            style={[styles.row, index > 0 && styles.divided]}
          >
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value}>{row.value}</Text>
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
  label: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
  name: { color: colors.text, flex: 1, fontFamily: fontFamilies.display, fontSize: 22 },
  request: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
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
  value: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
});
