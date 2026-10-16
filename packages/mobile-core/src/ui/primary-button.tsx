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
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  busy = false,
  size = "regular",
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
      style={[styles.button, size === "compact" && styles.compact, greyed && styles.disabledButton]}
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
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  compact: {
    minHeight: 48,
  },
  disabledButton: {
    backgroundColor: colors.disabledBackground,
  },
  label: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: "500",
  },
  disabledLabel: {
    color: colors.disabledText,
  },
});
