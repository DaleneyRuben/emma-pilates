import { Pressable, StyleSheet } from "react-native";
import { Polyline } from "react-native-svg";

import { LineIcon } from "./line-icon";
import { colors } from "./tokens";

/** The chevron above a screen's large title (S03, S05–S10). */
export function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Volver"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <LineIcon color={colors.text} size={22} strokeWidth={1.4} testID="back-chevron">
        <Polyline points="14.5,5 7.5,12 14.5,19" />
      </LineIcon>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    alignSelf: "flex-start",
    height: 44,
    justifyContent: "center",
    marginLeft: -10,
    width: 44,
  },
  pressed: { opacity: 0.7 },
});
