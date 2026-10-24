import { colors, radii, spacing, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text } from "react-native";

// A role root's header action, left of the account avatar: S15's «Mi
// disponibilidad» and the «Cerrar caja» of S04 and S11 (follow-up 150).
export function HeaderAction({
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
      hitSlop={spacing.xs}
      onPress={onPress}
      style={styles.action}
      testID={testID}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: { color: colors.primaryDeep, fontSize: typography.note },
});
