import { colors, shadows, spacing } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

/**
 * A fixed footer above the tab bar (equipo kit `footer(…, above_tabs=True)`):
 * the white panel cast upward with rounded top corners, reaching the screen's
 * sides (`bleed`, the `Screen`'s side padding). The tab bar keeps the safe
 * area, so the panel pads only 14 under its content.
 */
export function TabFooter({
  bleed = spacing.lg,
  children,
  style,
  testID,
}: {
  bleed?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View style={[styles.footer, { marginHorizontal: -bleed }, style]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    ...shadows.footer,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.smLg,
    paddingBottom: spacing.mdLg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.mdLg,
  },
});
