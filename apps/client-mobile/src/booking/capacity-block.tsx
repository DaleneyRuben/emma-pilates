import {
  colors,
  fontFamilies,
  radii,
  SeatPill,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

/**
 * 04's capacity block (MOB-049, follow-up 88): no card and no label. The
 * count row, «N de M cupos disponibles» with the number in Lora 18 and
 * «N reservados» on the right or the «Lleno» seat pill when the class is
 * full, sits over the 7 pt bar: a Palo de rosa fill by the booked share on
 * Palo de rosa tinte, Icono tenue when full.
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
        <Text style={styles.count}>
          <Text style={styles.number}>{full ? 0 : availableSeats}</Text>
          {` de ${capacity} cupos disponibles`}
        </Text>
        {full ? (
          <SeatPill full>Lleno</SeatPill>
        ) : (
          <Text style={styles.booked}>
            {bookedCount === 1 ? "1 reservado" : `${bookedCount} reservados`}
          </Text>
        )}
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ max: capacity, min: 0, now: bookedCount }}
        accessible
        style={styles.track}
      >
        <View
          style={[styles.fill, { flex: fill }, full && styles.fillFull]}
          testID="capacity-fill"
        />
        <View style={{ flex: 1 - fill }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.smLg },
  booked: { color: colors.textSubtle, fontSize: typography.label },
  count: { color: colors.text, flexShrink: 1, fontSize: typography.body },
  fill: { backgroundColor: colors.primary, borderRadius: radii.pill },
  fillFull: { backgroundColor: colors.iconQuiet },
  // The frame's Lora 18 count, a size the typography scale does not name.
  number: { fontFamily: fontFamilies.heading, fontSize: 18 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  track: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    flexDirection: "row",
    height: 7,
    overflow: "hidden",
  },
});
