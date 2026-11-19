import { Pressable, StyleSheet, Text } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, radii, spacing } from "./tokens";

/**
 * Selected and unselected in palette B (BotonAPiezas, FIX-089): the chosen
 * chip is Rosa profundo with a Crema label, the others Crema with an Arcilla
 * outline. Screens with their own shape (a day box, a tile) spread these.
 */
export const chipStyles = StyleSheet.create({
  box: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
  },
  boxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  labelSelected: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.bodyStrong,
    fontWeight: "600",
  },
});

/** A 38 pt chip whose touch target reaches 44 pt. */
export function Chip({
  accessibilityLabel,
  label,
  onPress,
  selected,
  testID,
}: {
  accessibilityLabel?: string;
  label: string;
  onPress: () => void;
  selected: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={{ bottom: 3, left: 0, right: 0, top: 3 }}
      onPress={onPress}
      style={[styles.chip, chipStyles.box, selected && chipStyles.boxSelected]}
      testID={testID}
    >
      <Text style={[chipStyles.label, selected && chipStyles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.mdLg,
  },
});
