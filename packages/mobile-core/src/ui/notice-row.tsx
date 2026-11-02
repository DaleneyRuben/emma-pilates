import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "./fonts";
import { Glyph } from "./glyph";
import { colors, spacing, typography } from "./tokens";

/**
 * A one-line warning (follow-up 225 §7, the system board's «08 ·
 * Advertencia»): an Error alert in an #F7E5E0 disc and the line on Lino. It
 * replaces the amber «Esto no se puede deshacer» block.
 */
export function NoticeRow({ message, testID }: { message: string; testID?: string }) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.disc} testID="notice-row-disc">
        <Glyph color={colors.error} name="alert" size={18} strokeWidth={1.6} />
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: "center",
    backgroundColor: colors.errorSurface,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
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
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
});
