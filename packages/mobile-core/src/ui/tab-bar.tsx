import type { ReactNode } from "react";
import { Platform, Pressable, type PressableProps, StyleSheet, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

import { colors, shadows, spacing } from "./tokens";
import { maxTextScale, textVariants } from "./type-scale";

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
    <Pressable
      {...props}
      aria-selected={selected}
      style={(state) => [typeof style === "function" ? style(state) : style, styles.button]}
    >
      <View
        style={[styles.pill, selected && styles.selected]}
        testID={selected ? "open-tab-pill" : undefined}
      >
        {children}
      </View>
    </Pressable>
  );
}

// React Navigation boxes each tab icon in 28 pt (UIKit), whatever its size.
const iconBoxHeight = 28;
const android = () => Platform.OS === "android";
// Android's bar is shorter than iOS's: a slimmer pill and a tighter bar.
const pillPadding = () => (android() ? spacing.xxs : spacing.sm);
const pillGap = () => (android() ? 1 : 3);
const barPadding = () => (android() ? spacing.xs : spacing.sm);

/** The pill's height: its padding, the icon box, the gap and the label, at this text size. */
export function tabBarPillHeight(fontScale = 1) {
  const scale = Math.min(Math.max(fontScale, 1), maxTextScale);
  const label = Math.ceil(textVariants.pastilla.lineHeight * scale);
  return pillPadding() * 2 + iconBoxHeight + pillGap() + label;
}

// The iOS home indicator needs about 20 of its 34 pt inset: the owner found
// the full inset left too much room under the labels (2026-11-20).
const homeIndicatorSpare = 14;

/** The room under the pill: iOS spares part of the home indicator's inset; Android's system bar is kept whole. */
function bottomPadding(bottomInset: number) {
  const padding = barPadding();
  if (android()) return padding + bottomInset;
  return Math.max(bottomInset - homeIndicatorSpare, padding);
}

/**
 * The white bar under the tabs: 8 pt over the pill (4 on Android), and under
 * it the home indicator's room (never less than the 8 above). React
 * Navigation sizes a bar without a height at 49 pt, which pushed the pill
 * down against the indicator.
 */
export function tabBarStyleFor(insets: Pick<EdgeInsets, "bottom">, fontScale = 1) {
  const padding = barPadding();
  const paddingBottom = bottomPadding(insets.bottom);
  return {
    ...shadows.tabBar,
    backgroundColor: colors.card,
    borderTopWidth: 0,
    height: padding + tabBarPillHeight(fontScale) + paddingBottom,
    paddingBottom,
    paddingTop: padding,
  } as const;
}

/**
 * Each tab as wide as its icon and label, plus an even share of the rest of
 * the bar (boards E-C04, E-F05): five staff tabs keep «Para contactar» and
 * «Disponibilidad» whole at 12 pt, which equal columns cut (follow-up 285).
 */
// React Navigation gives each item `flex: 1`, whose basis of 0 wins over an
// "auto" basis: `flex: 0` drops it, and the explicit grow and shrink return.
export const tabBarItemStyle = { flex: 0, flexBasis: "auto", flexGrow: 1, flexShrink: 1 } as const;

export const tabBarTints = {
  tabBarActiveTintColor: colors.onPrimary,
  tabBarInactiveTintColor: colors.text,
} as const;

const styles = StyleSheet.create({
  // The bar pads the pill: the tab adds no room of its own above or below it.
  button: { paddingVertical: 0 },
  pill: {
    alignItems: "center",
    borderRadius: 16,
    gap: pillGap(),
    maxWidth: "100%",
    minWidth: 56,
    paddingHorizontal: spacing.xs,
    paddingVertical: pillPadding(),
  },
  // Owner, 2026-11-20: the open pill is clearly wider than its label; the
  // 100% cap keeps «Para contactar» whole on a five-tab bar.
  selected: { backgroundColor: colors.primary, minWidth: 72, paddingHorizontal: spacing.lg },
});
