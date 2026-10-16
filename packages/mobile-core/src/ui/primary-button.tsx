import { Pressable, StyleSheet, Text, type GestureResponderEvent } from "react-native";

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
  size = "regular",
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        size === "compact" && styles.compact,
        disabled && styles.disabledButton,
      ]}
    >
      <Text style={[styles.label, disabled && styles.disabledLabel]}>{label}</Text>
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
