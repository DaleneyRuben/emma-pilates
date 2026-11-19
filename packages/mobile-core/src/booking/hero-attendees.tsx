import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "../ui/fonts";
import { colors, spacing, typography } from "../ui/tokens";

const shown = 5;

/** «Vienen 3 más», read after the hero's own label. */
export function attendeesLabel(count: number): string {
  return count === 1 ? "Viene 1 más" : `Vienen ${count} más`;
}

/**
 * Who is coming, under the next class hero (owner 2026-11-19): Crema circles
 * with Rosa profundo initials, five at most and «+N» for the rest.
 */
export function HeroAttendees({ initials }: { initials: readonly string[] }) {
  if (initials.length === 0) return null;
  const rest = initials.length - shown;
  const circles = rest > 0 ? [...initials.slice(0, shown), `+${rest}`] : initials;
  return (
    <View style={styles.row} testID="hero-attendees">
      {circles.map((text, index) => (
        <View key={`${text}-${index}`} style={styles.circle} testID="hero-attendee">
          <Text style={styles.initials}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    backgroundColor: colors.onEmphasis,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  initials: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "700",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
});
