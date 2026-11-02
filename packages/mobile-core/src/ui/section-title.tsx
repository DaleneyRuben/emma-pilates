import { StyleSheet, Text } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, spacing, typography } from "./tokens";

/** A list group's uppercase label, 12 above the group (follow-up 225 §3). */
export function SectionTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    // 0.12em of 12 pt.
    letterSpacing: typography.label * 0.12,
    marginBottom: spacing.md,
    textTransform: "uppercase",
  },
});
