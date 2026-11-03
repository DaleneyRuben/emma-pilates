import { Pressable, StyleSheet } from "react-native";

import { ButtonLabel } from "./button-label";
import { colors, radii, typography } from "./tokens";

/**
 * The outlined action of the cards and confirmation sheets: Palo de rosa by
 * default, the Error outline for a destructive confirmation (05, S06, S15, S17).
 */
export function OutlinedButton({
  busy = false,
  disabled = false,
  label,
  onPress,
  testID,
  tone = "primary",
}: {
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
  tone?: "primary" | "error";
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        styles.outlined,
        tone === "error" && styles.outlinedError,
        disabled && !busy && styles.outlinedDisabled,
      ]}
      testID={testID}
    >
      <ButtonLabel
        busy={busy}
        label={label}
        spinnerColor={tone === "error" ? colors.errorText : colors.primaryOnTint}
        style={[
          styles.outlinedLabel,
          tone === "error" && styles.outlinedLabelError,
          disabled && !busy && styles.disabledLabel,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabledLabel: { color: colors.disabledText },
  // Follow-up 225: the secondary action is filled, never outlined.
  outlined: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.button,
    borderWidth: 0,
    justifyContent: "center",
    minHeight: 52,
  },
  outlinedDisabled: { backgroundColor: colors.disabledBackground },
  outlinedError: { backgroundColor: colors.errorSurface },
  outlinedLabel: { color: colors.primaryOnTint, fontSize: typography.body, fontWeight: "600" },
  outlinedLabelError: { color: colors.errorText },
});
