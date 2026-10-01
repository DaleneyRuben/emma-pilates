import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";

import { fontFamilies } from "./fonts";
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
        <Svg
          accessibilityElementsHidden
          fill="none"
          height={22}
          importantForAccessibility="no-hide-descendants"
          stroke={colors.text}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.3}
          viewBox="0 0 24 24"
          width={22}
        >
          <Polyline points="14.5,5 7.5,12 14.5,19" />
        </Svg>
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
