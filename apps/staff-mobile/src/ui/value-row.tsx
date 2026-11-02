import { colors, fontFamilies, spacing } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

/** A label and its value on one Lino row (v2 S10, S14, S25 summaries). */
export function ValueRow({
  label,
  strong = false,
  tone,
  value,
}: {
  label: string;
  strong?: boolean;
  tone?: "emphasis";
  value: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, strong && styles.strongLabel]}>{label}</Text>
      {typeof value === "string" ? (
        <Text
          style={[styles.value, strong && styles.strongValue, tone === "emphasis" && styles.tint]}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, flexShrink: 1, fontFamily: fontFamilies.body, fontSize: 15 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  strongLabel: { color: colors.text, fontFamily: fontFamilies.bodyMedium },
  strongValue: { fontFamily: fontFamilies.display, fontSize: 22 },
  tint: { color: colors.primaryOnTint },
  value: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
});
