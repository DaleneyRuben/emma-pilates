import { StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "./fonts";
import { colors } from "./tokens";

/** The first letter of a name in Lora on the accent wash (MOB-042): S04's results, S11's payments. */
export function AvatarCircle({
  fontSize,
  name,
  size,
  testID = "avatar-circle",
}: {
  fontSize: number;
  name: string;
  size: number;
  testID?: string;
}) {
  return (
    <View
      style={[styles.circle, { borderRadius: size / 2, height: size, width: size }]}
      testID={testID}
    >
      <Text style={[styles.letter, { fontSize }]}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    backgroundColor: colors.accentWash,
    flexShrink: 0,
    justifyContent: "center",
  },
  letter: { color: colors.primaryDeep, fontFamily: fontFamilies.display },
});
