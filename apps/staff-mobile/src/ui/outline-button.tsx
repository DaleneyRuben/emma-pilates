import { colors, fontFamilies, radii, spacing, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text } from "react-native";

/**
 * The second action beside a PrimaryButton (staff pick E4 A): Crema with a
 * Rosa profundo border and label, as tall as the solid one.
 */
export function OutlineButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
      testID={testID}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderRadius: radii.button,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  label: {
    color: colors.primary,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
    textAlign: "center",
  },
});
