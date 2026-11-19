import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, radii, spacing, typography } from "./tokens";

/** «Faltan N datos para guardar» (FormB, FIX-089). */
export function missingFieldsTitle(count: number): string {
  return count === 1 ? "Falta 1 dato para guardar" : `Faltan ${count} datos para guardar`;
}

/**
 * The Rubor box at the top of a form after a save with fields missing or
 * wrong (FormB): how many, then their labels. The fields themselves are marked.
 */
export function FormErrorSummary({ fields }: { fields: readonly string[] }) {
  if (fields.length === 0) return null;
  return (
    <View accessibilityRole="alert" style={styles.box} testID="form-error-summary">
      <Text style={styles.title}>{missingFieldsTitle(fields.length)}</Text>
      <Text style={styles.fields}>{fields.join(" · ")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  fields: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "700",
  },
});
