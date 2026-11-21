import { StyleSheet, View } from "react-native";

import { Text } from "./text";
import { colors } from "./tokens";

/** Discs under 44 pt draw the initial in `pastilla`; 44 and over in `destacado`. */
const largeAvatar = 44;

/**
 * The first letter of a name on the accent wash (MOB-042): S04's results,
 * S11's payments. The letter is a scale variant, `pastilla` or `destacado` by
 * the disc's size, and never grows with the phone's text size, since the disc
 * does not (follow-up 285).
 */
export function AvatarCircle({
  name,
  size,
  testID = "avatar-circle",
}: {
  /** @deprecated The disc's size picks the letter's variant (follow-up 285). */
  fontSize?: number;
  name: string;
  size: number;
  testID?: string;
}) {
  return (
    <View
      style={[styles.circle, { borderRadius: size / 2, height: size, width: size }]}
      testID={testID}
    >
      <Text allowFontScaling={false} variant={size < largeAvatar ? "pastilla" : "destacado"}>
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    backgroundColor: colors.accentWash,
    borderColor: colors.borderStrong,
    borderWidth: 1.5,
    flexShrink: 0,
    justifyContent: "center",
  },
});
