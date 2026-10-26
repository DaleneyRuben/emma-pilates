import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "./tokens";

// Follow-up 73: «9+» above nine.
export function unreadCountLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}

/** The unread count in Palo de rosa profundo, never Error red (follow-up 73). */
export function UnreadCountPill({
  count,
  ring = false,
  testID,
}: {
  count: number;
  /** The 2 px white ring the Perfil tab badge draws over the icon. */
  ring?: boolean;
  testID?: string;
}) {
  if (count <= 0) return null;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.pill, ring && styles.ring]}
      testID={testID}
    >
      <Text style={styles.label}>{unreadCountLabel(count)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
  },
  pill: {
    alignItems: "center",
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 5,
  },
  ring: {
    borderColor: colors.white,
    borderWidth: 2,
    height: 22,
    minWidth: 22,
  },
});
