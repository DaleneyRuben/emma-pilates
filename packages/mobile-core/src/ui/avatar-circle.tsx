import { StyleSheet, View } from "react-native";

import { initials } from "../account/initials";
import { Text } from "./text";
import { colors } from "./tokens";

/** Discs under 44 pt draw the initials in `pastilla`; 44 and over in `destacado`. */
const largeAvatar = 44;

/**
 * A name's two initials on the accent wash (MOB-042, E-F18): S04's results,
 * S11's payments, the comments. They are a scale variant, `pastilla` or
 * `destacado` by the disc's size, and never grow with the phone's text size,
 * since the disc does not (follow-up 285).
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
        {initials(name)}
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
