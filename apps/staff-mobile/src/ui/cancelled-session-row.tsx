import { colors, fontFamilies, radii, spacing } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

/**
 * FIX-042 (S02, S02b; follow-up 245): a cancelled class keeps its place on
 * the agenda, muted: no fill of its own, a dashed edge, the start and length, the
 * class, and its cause under it. It opens nothing, since there is no
 * attendance to take.
 */
export function CancelledSessionRow({
  accessibilityLabel,
  cause,
  duration,
  testID,
  time,
  title,
}: {
  accessibilityLabel: string;
  cause: string;
  duration: string;
  testID?: string;
  time: string;
  title: string;
}) {
  return (
    <View accessibilityLabel={accessibilityLabel} accessible style={styles.row} testID={testID}>
      <View style={styles.timeColumn}>
        <Text numberOfLines={1} style={styles.time}>
          {time}
        </Text>
        <Text style={styles.quiet}>{duration}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>{cause}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: "flex-start", flex: 1, gap: spacing.sm },
  pill: {
    backgroundColor: "rgba(216, 201, 187, 0.34)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.smLg,
    paddingVertical: spacing.xs,
  },
  pillLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 12,
    fontWeight: "600",
  },
  quiet: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  row: {
    alignItems: "center",
    borderColor: "#D8C9BB",
    borderRadius: radii.card,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg - 1,
    paddingVertical: spacing.md - 1,
  },
  time: {
    color: colors.textMuted,
    fontFamily: fontFamilies.display,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
  },
  timeColumn: { flexShrink: 0, minWidth: 56 },
  title: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 16 },
});
