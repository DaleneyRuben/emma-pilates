import {
  colors,
  EmphasisCard,
  fontFamilies,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

/**
 * S08's hero (E-R03): when, the class in Lora, the free seats in Lora 40 and
 * a white bar of the booked share on a 500 track; a full class wears
 * «Completa» on a white capsule (E-R04).
 */
export function CapacitySummary({
  availableSeats,
  capacity,
  full,
  title,
  waitlistCount,
  when,
}: {
  availableSeats: number;
  capacity: number;
  full: boolean;
  title: string;
  waitlistCount: number;
  when: string;
}) {
  const free = full ? 0 : availableSeats;
  const booked = Math.min(1, Math.max(0, (capacity - free) / Math.max(capacity, 1)));
  return (
    <EmphasisCard eyebrow={when} testID="capacity-summary" title={title}>
      {full ? (
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Completa</Text>
        </View>
      ) : null}
      <View style={styles.count}>
        <Text style={styles.free}>{String(free)}</Text>
        <Text style={styles.of}>
          {full && waitlistCount > 0
            ? `lugares libres de ${capacity} · ${waitlistCount} en espera`
            : `lugares libres de ${capacity}`}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${booked * 100}%` }]} testID="capacity-bar" />
      </View>
    </EmphasisCard>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.onEmphasis, height: "100%" },
  count: { alignItems: "baseline", flexDirection: "row", flexWrap: "wrap", gap: spacing.smLg },
  free: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
    lineHeight: 44,
  },
  of: {
    color: colors.onEmphasis,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.titleSmall,
    fontWeight: "700",
  },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: spacing.md,
  },
  pillLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
  },
  track: {
    backgroundColor: colors.medio,
    borderRadius: spacing.xs,
    height: spacing.sm,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
});
