import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, radii, spacing, typography } from "./tokens";

/** «Faltan N datos para guardar» (FormB, FIX-089); `action` names another verb. */
export function missingFieldsTitle(count: number, action = "guardar"): string {
  return count === 1 ? `Falta 1 dato para ${action}` : `Faltan ${count} datos para ${action}`;
}

/**
 * The Rubor box at the top of a form after a save with fields missing or
 * wrong (FormB): how many, then their labels. The fields themselves are marked.
 */
export function FormErrorSummary({
  action,
  fields,
  title,
}: {
  /** The verb after «para», «guardar» unless told otherwise. */
  action?: string;
  fields: readonly string[];
  /** A screen's own line for the count, such as «Revisa 2 datos antes de seguir». */
  title?: (count: number) => string;
}) {
  if (fields.length === 0) return null;
  return (
    <View accessibilityRole="alert" style={styles.box} testID="form-error-summary">
      <Text style={styles.title}>
        {title === undefined ? missingFieldsTitle(fields.length, action) : title(fields.length)}
      </Text>
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
