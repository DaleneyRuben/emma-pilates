import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "../ui/fonts";
import { colors, radii, spacing, typography } from "../ui/tokens";

/**
 * The seat pill of 03, S02, S07, and S13 (follow-up 84, MOB-047): the number
 * or word carries the state, so it takes no dot. Seats remaining sit on Palo
 * de rosa tinte in Palo de rosa oscuro; a full class on the neutral pill in
 * Texto secundario, never Error red and never Éxito green.
 */
export function SeatPill({
  children,
  full = false,
  testID = "seat-pill",
}: {
  children: string;
  full?: boolean;
  testID?: string;
}) {
  return (
    <View style={[styles.pill, full && styles.pillFull]} testID={testID}>
      <Text style={[styles.label, full && styles.labelFull]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
  },
  labelFull: { color: colors.textSecondary },
  pill: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
  },
  pillFull: { backgroundColor: colors.neutralPill },
});
