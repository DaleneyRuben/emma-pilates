import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

import { fontFamilies } from "./fonts";
import { Glyph, type GlyphName } from "./glyph";
import { colors, spacing, typography } from "./tokens";

/**
 * A glyph before a short line of text (MOB-042): the Trainer of 03, S07,
 * and S13, the Branch of S02 and S13, the booked count of S02.
 */
export function DetailLine({
  children,
  icon,
  iconColor,
  iconSize = 17,
  style,
}: {
  children: string;
  icon: GlyphName;
  iconColor?: string;
  iconSize?: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.line}>
      <Glyph color={iconColor} name={icon} size={iconSize} />
      <Text style={[styles.text, style]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  text: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
  },
});
