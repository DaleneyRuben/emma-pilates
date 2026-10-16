import { ButtonLabel, colors, radii, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet } from "react-native";

export function OutlinedButton({
  busy = false,
  disabled = false,
  label,
  onPress,
  tone = "primary",
}: {
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
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
