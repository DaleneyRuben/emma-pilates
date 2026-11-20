import type { ReactNode } from "react";
import { Pressable, type PressableProps, StyleSheet, View } from "react-native";

import { colors, shadows, spacing } from "./tokens";

type TabBarButtonProps = Omit<PressableProps, "children"> & {
  "aria-selected"?: boolean;
  children?: ReactNode;
  href?: string;
};

/**
 * A tab's button (Rosa Emma): the open tab's icon and label sit in a 600 pill
 * with white tints; the others stay bare on the white bar. Pass it as
 * `tabBarButton` with `tabBarActiveTintColor: colors.onPrimary`.
 */
export function TabBarButton({
  "aria-selected": selected = false,
  children,
  href: _href,
  style,
  ...props
}: TabBarButtonProps) {
  return (
    <Pressable {...props} aria-selected={selected} style={style}>
      <View
        style={[styles.pill, selected && styles.selected]}
        testID={selected ? "tab-bar-pill" : undefined}
      >
        {children}
      </View>
    </Pressable>
  );
}

/** The white bar under the tabs, a 1 pt 200 rule on top. */
export const tabBarStyle = {
  ...shadows.tabBar,
  backgroundColor: colors.card,
  borderTopWidth: 0,
  paddingTop: spacing.sm,
} as const;

export const tabBarTints = {
  tabBarActiveTintColor: colors.onPrimary,
  tabBarInactiveTintColor: colors.text,
} as const;

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    borderRadius: 16,
    gap: 3,
    minWidth: 56,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
  },
  selected: { backgroundColor: colors.primary },
});
