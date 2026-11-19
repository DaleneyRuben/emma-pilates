import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";

import { ButtonLabel } from "./button-label";
import { fontFamilies } from "./fonts";
import { colors, radii, spacing, typography } from "./tokens";

type PrimaryButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  /** Why it cannot be pressed, said under it while disabled (FIX-089). */
  disabledReason?: string;
  /** A request it sent is in flight (follow-up 93). */
  busy?: boolean;
  /** «compact» for the 48 pt action inside a card. */
  size?: "compact" | "regular";
  testID?: string;
  /** «error» confirms a destructive action: the secondary look, never red (FIX-089). */
  tone?: "error" | "primary";
};

/** The screen's one solid action: Rosa profundo with a Crema label (palette B). */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  disabledReason,
  busy = false,
  size = "regular",
  testID,
  tone = "primary",
}: PrimaryButtonProps) {
  // Busy keeps the fill: a disabled look would read as unavailable, not as working.
  const greyed = disabled && !busy;
  const quiet = tone === "error" || greyed;
  const button = (
    <Pressable
      accessibilityHint={greyed ? disabledReason : undefined}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        styles.button,
        size === "compact" && styles.compact,
        tone === "error" && styles.secondary,
        greyed && styles.disabledButton,
      ]}
      testID={testID}
    >
      <ButtonLabel
        busy={busy}
        label={label}
        spinnerColor={quiet ? colors.primary : colors.onPrimary}
        style={[styles.label, quiet && styles.quietLabel, greyed && styles.disabledLabel]}
        testID="primary-button-spinner"
      />
    </Pressable>
  );
  if (!greyed || !disabledReason) return button;
  return (
    <View style={styles.withReason}>
      {button}
      <Text style={styles.reason}>{disabledReason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderRadius: radii.button,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  compact: {
    minHeight: 48,
  },
  secondary: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
  },
  disabledButton: {
    backgroundColor: colors.disabledBackground,
    borderColor: colors.border,
  },
  label: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
  },
  quietLabel: {
    color: colors.primary,
  },
  disabledLabel: {
    color: colors.disabledText,
    fontFamily: fontFamilies.bodyMedium,
    fontWeight: "500",
  },
  reason: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    textAlign: "center",
  },
  withReason: { gap: spacing.smd },
});
