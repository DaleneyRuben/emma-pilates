import { Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";

import { ButtonLabel } from "./button-label";
import { Text } from "./text";
import { colors, radii, spacing } from "./tokens";

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
  /** «error» confirms a destructive action: the secondary look, never red (FIX-089).
   * «destructivo» fills it in Destructivo for an action that ends something
   * («Cerrar sesión», follow-up 292). */
  tone?: "destructivo" | "error" | "primary";
};

/**
 * The screen's one solid action: 600 with a white `boton` label (Rosa Emma,
 * follow-up 285). Disabled, it turns to the 50 ground with a 400 outline and
 * says why under it in `secundario`; the label keeps its weight.
 */
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
        tone === "destructivo" && styles.destructivo,
        greyed && styles.disabledButton,
      ]}
      testID={testID}
    >
      <ButtonLabel
        busy={busy}
        label={label}
        spinnerColor={quiet ? colors.primary : colors.onPrimary}
        testID="primary-button-spinner"
        tone={quiet ? "ink" : "onDark"}
      />
    </Pressable>
  );
  if (!greyed || !disabledReason) return button;
  return (
    <View style={styles.withReason}>
      {button}
      <Text style={styles.reason} variant="secundario">
        {disabledReason}
      </Text>
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
  destructivo: {
    backgroundColor: colors.destructivo,
    borderColor: colors.destructivo,
  },
  secondary: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
  },
  disabledButton: {
    backgroundColor: colors.disabledBackground,
    borderColor: colors.borderStrong,
  },
  reason: { textAlign: "center" },
  withReason: { gap: spacing.smd },
});
