import { Pressable, StyleSheet } from "react-native";

import { ButtonLabel } from "./button-label";
import { colors, radii } from "./tokens";

/**
 * The secondary action of the cards and confirmation sheets (Rosa Emma):
 * white with a 1.5 pt 600 outline and an ink `boton` label. The destructive
 * tone looks the same; a confirmation guards it instead of red. Disabled, it
 * turns to the 50 ground; the label keeps its weight (follow-up 285).
 */
export function OutlinedButton({
  busy = false,
  disabled = false,
  label,
  onPress,
  testID,
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
      style={[styles.outlined, disabled && !busy && styles.outlinedDisabled]}
      testID={testID}
    >
      <ButtonLabel busy={busy} label={label} spinnerColor={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outlined: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderRadius: radii.button,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  outlinedDisabled: {
    backgroundColor: colors.disabledBackground,
    borderColor: colors.borderStrong,
  },
});
