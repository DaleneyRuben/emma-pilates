import { Pressable, StyleSheet } from "react-native";

import { ButtonLabel } from "./button-label";
import { fontFamilies } from "./fonts";
import { colors, radii, typography } from "./tokens";

/**
 * The secondary action of the cards and confirmation sheets (palette B,
 * FIX-089): Crema with a Rosa profundo outline. The destructive tone looks the
 * same; a confirmation guards it instead of red.
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
      <ButtonLabel
        busy={busy}
        label={label}
        spinnerColor={colors.primary}
        style={[styles.outlinedLabel, disabled && !busy && styles.disabledLabel]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabledLabel: { fontFamily: fontFamilies.bodyMedium, fontWeight: "500" },
  outlined: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderRadius: radii.button,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 48,
  },
  outlinedDisabled: { borderColor: colors.border },
  outlinedLabel: {
    color: colors.primary,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
});
