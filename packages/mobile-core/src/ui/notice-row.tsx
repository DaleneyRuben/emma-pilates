import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "./fonts";
import { Glyph } from "./glyph";
import { colors, spacing, typography } from "./tokens";

/**
 * A one-line warning (follow-up 225 §7): the alert glyph alone, no disc
 * (FIX-089), and the line on a Crema card with an Arcilla outline.
 */
export function NoticeRow({ message, testID }: { message: string; testID?: string }) {
  return (
    <View style={styles.row} testID={testID}>
      <Glyph color={colors.error} name="alert" size={20} strokeWidth={1.6} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    lineHeight: 21,
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
});
