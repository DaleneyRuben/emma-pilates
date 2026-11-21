import { StyleSheet, View } from "react-native";

import { Text } from "./text";
import { colors, spacing } from "./tokens";

/** «Faltan N datos para guardar» (FormB, FIX-089); `action` names another verb. */
export function missingFieldsTitle(count: number, action = "guardar"): string {
  return count === 1 ? `Falta 1 dato para ${action}` : `Faltan ${count} datos para ${action}`;
}

/**
 * The Rubor box at the top of a form after a save with fields missing or
 * wrong (FormB): how many in `titulo-fila`, then their labels in `cuerpo`
 * (follow-up 285). The fields themselves are marked.
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
      <Text variant="titulo-fila">
        {title === undefined ? missingFieldsTitle(fields.length, action) : title(fields.length)}
      </Text>
      <Text variant="cuerpo">{fields.join(" · ")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: spacing.sm,
    padding: spacing.lg,
  },
});
