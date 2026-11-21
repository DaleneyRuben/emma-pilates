import { StyleSheet } from "react-native";

import { Text } from "./text";
import { spacing } from "./tokens";

/**
 * A list group's heading on the 100 screen (Rosa Emma): `titulo-seccion`, a
 * size the screen's background allows, 12 above the group (follow-up 285).
 */
export function SectionTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.title} variant="titulo-seccion">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
});
