import { StyleSheet, Text } from "react-native";

import { fontFamilies } from "../ui/fonts";
import { colors, typography } from "../ui/tokens";

/**
 * The places of a class (follow-up 84, MOB-047; FIX-089): a normal state, so
 * plain bold text, never a pill. «full» is kept for callers; the words say it.
 */
export function SeatPill({
  children,
  testID = "seat-pill",
}: {
  children: string;
  full?: boolean;
  testID?: string;
}) {
  return (
    <Text style={styles.label} testID={testID}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "600",
  },
});
