import { colors, fontFamilies, radii, spacing, typography } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

/**
 * 04's seats on the hero card (follow-up 227, C04): the free count in Lora 32
 * white over «de M cupos libres», then a white bar by the booked share on
 * white 25 %.
 */
export function CapacityBlock({
  availableSeats,
  bookedCount,
  capacity,
  full,
}: {
  availableSeats: number;
  bookedCount: number;
  capacity: number;
  full: boolean;
}) {
  const fill = full ? 1 : capacity === 0 ? 0 : bookedCount / capacity;

  return (
    <View style={styles.block} testID="capacity-block">
      <View style={styles.row}>
        <Text style={styles.number}>{String(full ? 0 : availableSeats)}</Text>
        <Text style={styles.label}>{`de ${capacity} cupos libres`}</Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ max: capacity, min: 0, now: bookedCount }}
        accessible
        style={styles.track}
      >
        <View style={[styles.fill, { flex: fill }]} testID="capacity-fill" />
        <View style={{ flex: 1 - fill }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md, marginTop: spacing.xs },
  fill: { backgroundColor: colors.white, borderRadius: radii.pill },
  label: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
  },
  number: {
    color: colors.white,
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
  },
  row: { alignItems: "baseline", flexDirection: "row", gap: spacing.sm },
  track: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: radii.pill,
    flexDirection: "row",
    height: 6,
    overflow: "hidden",
  },
});
