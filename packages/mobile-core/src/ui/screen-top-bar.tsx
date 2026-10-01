import { Pressable, StyleSheet, Text, View } from "react-native";
import { Polyline } from "react-native-svg";

import { fontFamilies } from "./fonts";
import { LineIcon } from "./line-icon";
import { colors, radii, spacing } from "./tokens";

/** The export's screen bar: a back chevron and the screen's title over a rule. */
export function ScreenTopBar({
  onBack,
  title,
}: {
  onBack: () => void;
  title: string;
}) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityLabel="Volver"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
      >
        <LineIcon color={colors.text} size={22} strokeWidth={1.3}>
          <Polyline points="14.5,5 7.5,12 14.5,19" />
        </LineIcon>
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: "center",
    borderRadius: radii.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  backPressed: {
    backgroundColor: colors.background,
  },
  bar: {
    alignItems: "center",
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.smd,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.smd,
  },
  title: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.heading,
    fontSize: 19,
  },
});
