import { StyleSheet, View } from "react-native";

import { Text } from "./text";
import { colors, radii, spacing } from "./tokens";

/**
 * The one pill palette B allows (FIX-089): an exception such as «Por vencer»
 * or «Primera clase», `pastilla` in ink on 50 (follow-up 285). Normal states
 * are words.
 */
export function ExceptionPill({
  children,
  testID = "exception-pill",
}: {
  children: string;
  testID?: string;
}) {
  return (
    <View style={styles.pill} testID={testID}>
      <Text variant="pastilla">{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primaryTint,
    borderColor: colors.borderSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: spacing.md,
  },
});
