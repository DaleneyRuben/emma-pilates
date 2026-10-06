import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CardFooter } from "../ui/card-footer";
import { Chevron } from "../ui/chevron";
import { DetailLine } from "../ui/detail-line";
import { fontFamilies } from "../ui/fonts";
import { colors, spacing, surfaces, typography } from "../ui/tokens";

/**
 * The Session card of 03 and S07 (MOB-042): a spaced 12 pt time over a Lora
 * 19 title with the seat pill on the right, then the Trainer and the chevron
 * under a rule.
 */
export function SessionCard({
  accessibilityLabel,
  onPress,
  tag,
  time,
  title,
  trainerName,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  tag: ReactNode;
  time: string;
  title: string;
  trainerName: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        {tag}
      </View>
      <CardFooter>
        <DetailLine icon="person" style={styles.trainer}>
          {trainerName}
        </DetailLine>
        <Chevron />
      </CardFooter>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lgXl },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  time: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.titleSmall,
  },
  titles: { flexShrink: 1, gap: spacing.xs },
  trainer: { color: colors.textSecondary, fontSize: 14 },
});
