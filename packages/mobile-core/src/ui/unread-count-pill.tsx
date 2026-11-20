import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, radii } from "./tokens";

// Follow-up 73: «9+» above nine.
export function unreadCountLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}

/** The unread count in rosa profundo, never Error red (follow-up 73). */
export function UnreadCountPill({
  count,
  inverted = false,
  ring = false,
  testID,
}: {
  count: number;
  /** White with a 600 count, on a 600 surface such as the open tab's pill. */
  inverted?: boolean;
  /** The 2 px white ring the Perfil tab badge draws over the icon. */
  ring?: boolean;
  testID?: string;
}) {
  if (count <= 0) return null;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.pill, ring && styles.ring, inverted && styles.inverted]}
      testID={testID}
    >
      <Text style={[styles.label, inverted && styles.invertedLabel]}>
        {unreadCountLabel(count)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inverted: { backgroundColor: colors.card },
  invertedLabel: { color: colors.primary },
  label: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: "700",
  },
  pill: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 18,
    minWidth: 18,
    paddingHorizontal: 5,
  },
  ring: {
    borderColor: colors.card,
    borderWidth: 2,
    minHeight: 22,
    minWidth: 22,
  },
});
