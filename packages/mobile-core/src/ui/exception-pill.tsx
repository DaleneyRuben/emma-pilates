import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, radii, spacing, typography } from "./tokens";

/**
 * The one pill palette B allows (FIX-089): an exception such as «Por vencer»
 * or «Primera clase», bold Rosa profundo on Rubor. Normal states are words.
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
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "700",
  },
  pill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 24,
    paddingHorizontal: spacing.smLg,
  },
});
