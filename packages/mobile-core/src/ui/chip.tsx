import { Pressable, StyleSheet } from "react-native";

import { Text } from "./text";
import { colors, radii, spacing } from "./tokens";

/**
 * Selected and unselected in palette B (BotonAPiezas, FIX-089): the chosen
 * chip is Rosa profundo, the others white with a 400 outline. Screens with
 * their own shape (a day box, a tile) spread these and draw their label with
 * `<Text tone={selected ? "onDark" : "ink"}>`: the choice changes the ground
 * and the tone, never the weight (follow-up 285, rule 4).
 */
export const chipStyles = StyleSheet.create({
  box: {
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderWidth: 1.5,
  },
  boxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});

/**
 * A 38 pt chip whose touch target reaches 44 pt; «radio» for one answer of a
 * group. Its label is `compacto`, the same selected or not.
 */
export function Chip({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
  role = "button",
  selected,
  size = "regular",
  testID,
}: {
  accessibilityLabel?: string;
  /** Locked on another answer, as «¿Cómo nos conociste?» under a valid code (#18). */
  disabled?: boolean;
  label: string;
  onPress: () => void;
  role?: "button" | "radio";
  selected: boolean;
  /** «compact»: 36 high, as Reservar's type filter; the same label. */
  size?: "compact" | "regular";
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={role}
      accessibilityState={
        role === "radio" ? { checked: selected, disabled } : { disabled, selected }
      }
      disabled={disabled}
      hitSlop={{ bottom: 3, left: 0, right: 0, top: 3 }}
      onPress={onPress}
      style={[
        styles.chip,
        size === "compact" && styles.compact,
        chipStyles.box,
        selected && chipStyles.boxSelected,
      ]}
      testID={testID}
    >
      <Text tone={selected ? "onDark" : "ink"} variant="compacto">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compact: { minHeight: 36 },
  chip: {
    alignItems: "center",
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.mdLg,
  },
});
