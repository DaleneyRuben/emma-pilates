import { StyleSheet, View } from "react-native";

import { Text } from "../ui/text";
import { colors, spacing } from "../ui/tokens";

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
          {/* Initials in a fixed 32 pt disc: pastilla, never scaled out of it. */}
          <Text allowFontScaling={false} variant="pastilla">
            {text}
          </Text>
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
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
});
