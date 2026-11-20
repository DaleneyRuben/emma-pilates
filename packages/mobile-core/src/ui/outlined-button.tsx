import { Pressable, StyleSheet } from "react-native";

import { ButtonLabel } from "./button-label";
import { fontFamilies } from "./fonts";
import { colors, radii, typography } from "./tokens";

/**
 * The secondary action of the cards and confirmation sheets (Rosa Emma):
 * white with a 1.5 pt 600 outline. The destructive tone looks the
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
    minHeight: 52,
    paddingHorizontal: 18,
  },
  outlinedDisabled: {
    backgroundColor: colors.disabledBackground,
    borderColor: colors.borderStrong,
  },
  outlinedLabel: {
    color: colors.primary,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.bodyMedium,
    fontWeight: "700",
  },
});
