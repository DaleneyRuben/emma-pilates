import { spacing, Text } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

/**
 * A label and its value on one Lino row (v2 S10, S14, S25 summaries): the key
 * in `cuerpo`, the value in `titulo-fila`. `strong` is the total: its key in
 * `titulo-fila`, its amount in `cifra`.
 */
export function ValueRow({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label} variant={strong ? "titulo-fila" : "cuerpo"}>
        {label}
      </Text>
      {typeof value === "string" ? (
        <Text style={styles.value} variant={strong ? "cifra" : "titulo-fila"}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { flexShrink: 1 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  value: { textAlign: "right" },
});
