import { StyleSheet, Text } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, spacing, typography } from "./tokens";

/**
 * A list group's heading on the 100 screen (Rosa Emma): Lora 24, the only
 * size the screen's background allows, 12 above the group.
 */
export function SectionTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.section,
    lineHeight: 28,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
});
