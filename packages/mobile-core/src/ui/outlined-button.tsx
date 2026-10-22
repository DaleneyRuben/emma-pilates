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
        spinnerColor={tone === "error" ? colors.errorText : colors.primaryDeep}
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
  outlined: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: colors.primary,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  outlinedDisabled: { borderColor: colors.border },
  outlinedError: { borderColor: colors.error },
  outlinedLabel: { color: colors.primaryDeep, fontSize: typography.body, fontWeight: "500" },
  outlinedLabelError: { color: colors.errorText },
});
