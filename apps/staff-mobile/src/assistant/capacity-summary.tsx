import { colors, SeatPill, spacing, surfaces, typography } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

/**
 * S08's capacity summary (MOB-048, follow-up 87): «N de M cupos disponibles»
 * beside the seat pill («Con cupos», or «Completa» when full) in a flat
 * Blanco card; the pill alone carries the state, so the box takes no tint.
 */
export function CapacitySummary({
  availableSeats,
  capacity,
  full,
}: {
  availableSeats: number;
  capacity: number;
  full: boolean;
}) {
  return (
    <View style={styles.box} testID="capacity-summary">
      <Text style={styles.text}>
        {`${full ? 0 : availableSeats} de ${capacity} cupos disponibles`}
      </Text>
      <SeatPill full={full}>{full ? "Completa" : "Con cupos"}</SeatPill>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    ...surfaces.flatCard,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lgXl,
    paddingVertical: spacing.lg,
  },
  text: { color: colors.text, flexShrink: 1, fontSize: typography.body },
});
