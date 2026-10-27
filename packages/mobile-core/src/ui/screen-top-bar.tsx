import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Polyline } from "react-native-svg";

import { fontFamilies } from "./fonts";
import { LineIcon } from "./line-icon";
import { colors, radii, spacing } from "./tokens";

/** The export's screen bar: a back chevron and the screen's title over a rule. */
export function ScreenTopBar({
  action,
  fullBleed = false,
  onBack,
  title,
  tone = "title",
}: {
  /** A link at the end of the bar, such as 19's «Marcar leídas». */
  action?: ReactNode;
  /** Inside a padded `Screen`: span its padding so the rule meets the edges. */
  fullBleed?: boolean;
  onBack: () => void;
  title: string;
  /** «context» for 04's muted label of where the screen was opened from. */
  tone?: "context" | "title";
}) {
  const context = tone === "context";
  return (
    <View style={[styles.bar, fullBleed && styles.fullBleed]} testID="screen-top-bar">
      <View style={styles.controls}>
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
        {action === undefined ? null : <View style={styles.action}>{action}</View>}
      </View>
      <Text
        accessibilityLabel={title}
        accessibilityRole={context ? undefined : "header"}
        style={context ? styles.context : styles.title}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    flexShrink: 0,
    marginLeft: "auto",
  },
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
    borderBottomColor: colors.rule,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.smd,
  },
  controls: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  context: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    paddingHorizontal: spacing.sm,
  },
  // `Screen` pads by spacing.lg on every side.
  fullBleed: {
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: 19,
    paddingHorizontal: spacing.sm,
  },
});
