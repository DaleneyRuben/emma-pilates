import { Pressable, StyleSheet, Text } from "react-native";

import { Chevron } from "./chevron";
import { fontFamilies } from "./fonts";
import { Glyph } from "./glyph";
import { colors, radii, spacing } from "./tokens";

/** The «Sucursal:» picker of 03, S07, and S13 (MOB-042): a 44 pt pill with a pin and the muted chevron. */
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
      <Text style={styles.label}>Sucursal:</Text>
      <Text style={[styles.label, styles.name]}>{name}</Text>
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
  label: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
  name: { fontFamily: fontFamilies.bodyMedium, fontWeight: "500" },
  pill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.smLg,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
});
