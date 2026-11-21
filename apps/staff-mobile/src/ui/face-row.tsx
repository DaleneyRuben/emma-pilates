import { spacing, Text } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

/**
 * An `IconRow` whose icon disc is a person's 36 px face (FIX-041, follow-up
 * 242: S08's «Instructora» row). Same measures, so it sits in an
 * `IconRowGroup` with its hairline inset at 64.
 */
export function FaceRow({
  face,
  label,
  testID,
  value,
}: {
  face: ReactNode;
  label: string;
  testID?: string;
  value: string;
}) {
  return (
    <View style={styles.row} testID={testID}>
      {face}
      <Text style={styles.label} variant="titulo-fila">
        {label}
      </Text>
      <Text style={styles.value} variant="compacto">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { flexGrow: 1, flexShrink: 0 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  value: { flexShrink: 1, textAlign: "right" },
});
