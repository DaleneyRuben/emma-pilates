import { colors, fontFamilies, spacing, typography } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

/** A v2 section title with a quiet figure on the right («Bs 697 en total»). */
export function SectionHeader({ meta, title }: { meta?: string; title: string }) {
  return (
    <View style={styles.row}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {meta === undefined ? null : <Text style={styles.meta}>{meta}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  meta: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    fontVariant: ["tabular-nums"],
  },
  row: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
});
