import { colors, EmphasisCard, fontFamilies, radii, spacing } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

/**
 * S08's hero (v2): when, the class in Lora 24, the free seats in Lora 32 and
 * a white bar of the booked share; a full class wears «Completa».
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
    <View testID="capacity-summary" style={styles.wrap}>
      <EmphasisCard eyebrow={when} pill={full ? "Completa" : undefined} title={title}>
        <View style={styles.count}>
          <Text style={styles.free}>{String(free)}</Text>
          <Text style={styles.of}>
            {full && waitlistCount > 0
              ? `cupos libres de ${capacity} · ${waitlistCount} en espera`
              : `cupos libres de ${capacity}`}
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${booked * 100}%` }]} testID="capacity-bar" />
        </View>
      </EmphasisCard>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.white, borderRadius: radii.pill, height: 6 },
  count: { alignItems: "baseline", flexDirection: "row", gap: spacing.sm },
  free: {
    color: colors.white,
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
  },
  of: { color: "rgba(255,255,255,0.85)", fontFamily: fontFamilies.body, fontSize: 14 },
  track: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: radii.pill, height: 6 },
  wrap: { backgroundColor: colors.emphasis, borderRadius: 20 },
});
