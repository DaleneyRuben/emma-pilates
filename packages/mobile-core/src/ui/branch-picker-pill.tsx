import { Pressable, StyleSheet } from "react-native";

import { Chevron } from "./chevron";
import { Glyph } from "./glyph";
import { Text } from "./text";
import { colors, radii, spacing } from "./tokens";

/**
 * The «Sucursal:» picker of 03, S07, and S13 (MOB-042): a 44 pt white pill
 * with a pin, «Sucursal: Centro» in `compacto` as board C03 draws it, and the
 * muted chevron (follow-up 285).
 */
export function BranchPickerPill({
  name,
  onPress,
  open,
}: {
  name: string;
  onPress: () => void;
  open: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={`Sucursal: ${name}`}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={styles.pill}
    >
      <Glyph name="pin" size={17} />
      <Text variant="compacto">{`Sucursal: ${name}`}</Text>
      <Chevron
        direction={open ? "up" : "down"}
        size={16}
        testID="branch-picker-chevron"
        tone="muted"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.smLg,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
});
