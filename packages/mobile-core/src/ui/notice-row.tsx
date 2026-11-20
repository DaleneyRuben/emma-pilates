import { StyleSheet, View } from "react-native";

import { Glyph } from "./glyph";
import { Text } from "./text";
import { colors, spacing, surfaces } from "./tokens";

/**
 * A one-line warning (follow-up 225 §7): the alert glyph alone, no disc
 * (FIX-089), and the line in `cuerpo` on a Crema card with an Arcilla outline.
 */
export function NoticeRow({ message, testID }: { message: string; testID?: string }) {
  return (
    <View style={styles.row} testID={testID}>
      <Glyph color={colors.error} name="alert" size={20} strokeWidth={1.6} />
      <Text style={styles.message} variant="cuerpo">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  message: { flex: 1 },
  row: {
    ...surfaces.soft,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
});
