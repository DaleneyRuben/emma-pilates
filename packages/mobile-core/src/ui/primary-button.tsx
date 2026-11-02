import { Pressable, StyleSheet, type GestureResponderEvent } from "react-native";

import { ButtonLabel } from "./button-label";
import { colors, radii, spacing, typography } from "./tokens";

type PrimaryButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  /** A request it sent is in flight (follow-up 93). */
  busy?: boolean;
  /** «compact» for the 48 pt action inside a card. */
  size?: "compact" | "regular";
  testID?: string;
  /** «error» is the solid destructive confirmation inside a sheet (follow-up 226). */
  tone?: "error" | "primary";
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  busy = false,
  size = "regular",
  testID,
  tone = "primary",
}: PrimaryButtonProps) {
  // Busy keeps the fill: grey would read as unavailable, not as working.
  const greyed = disabled && !busy;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        styles.button,
        size === "compact" && styles.compact,
        tone === "error" && styles.errorButton,
        greyed && styles.disabledButton,
      ]}
      testID={testID}
    >
      <ButtonLabel
        busy={busy}
        label={label}
        spinnerColor={colors.white}
        style={[styles.label, greyed && styles.disabledLabel]}
        testID="primary-button-spinner"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  compact: {
    minHeight: 48,
  },
  errorButton: {
    backgroundColor: colors.error,
  },
  disabledButton: {
    backgroundColor: colors.disabledBackground,
  },
  label: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: "600",
  },
  disabledLabel: {
    color: colors.disabledText,
  },
});
