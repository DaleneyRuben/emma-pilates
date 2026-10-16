import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
} from "react-native";

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
      {/* The hidden label keeps the button's size while the spinner shows. */}
      <Text style={[styles.label, greyed && styles.disabledLabel, busy && styles.hiddenLabel]}>
        {label}
      </Text>
      {busy ? (
        <ActivityIndicator
          color={colors.white}
          size="small"
          style={styles.spinner}
          testID="primary-button-spinner"
        />
      ) : null}
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
  hiddenLabel: {
    opacity: 0,
  },
  label: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: "500",
  },
  disabledLabel: {
    color: colors.disabledText,
  },
  spinner: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
