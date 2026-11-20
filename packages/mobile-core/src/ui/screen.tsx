import { createContext, type ReactNode, type RefObject, useContext, useRef } from "react";
import { StyleSheet, type View, type ViewStyle } from "react-native";
import {
  type Edge,
  SafeAreaInsetsContext,
  SafeAreaView,
  type SafeAreaViewProps,
} from "react-native-safe-area-context";

import { colors, spacing } from "./tokens";

const allEdges: readonly Edge[] = ["top", "right", "bottom", "left"];
const tabEdges: readonly Edge[] = ["top", "right", "left"];

const InsideTabBarContext = createContext(false);

// FIX-023: the tab bar already covers the bottom safe area, so the apps wrap
// every tab screen in this to keep Screen from adding it a second time.
export function InsideTabBar({ children }: { children: ReactNode }) {
  return <InsideTabBarContext.Provider value>{children}</InsideTabBarContext.Provider>;
}

/**
 * What a header band needs to reach the screen's edges (Rosa Emma): the
 * screen's own view, and how far its content starts from its top-left corner.
 */
export type ScreenFrame = {
  ref: RefObject<View | null>;
  /** The screen's top padding plus the top safe area it keeps. */
  top: number;
  left: number;
};

export const ScreenFrameContext = createContext<ScreenFrame | null>(null);

function paddingOf(
  style: SafeAreaViewProps["style"],
  side: "Left" | "Top",
  fallback: number,
): number {
  const flat: ViewStyle = StyleSheet.flatten([styles.screen, style]) ?? {};
  const axis = side === "Top" ? flat.paddingVertical : flat.paddingHorizontal;
  const value = flat[`padding${side}`] ?? axis ?? flat.padding ?? fallback;
  return typeof value === "number" ? value : fallback;
}

export function Screen({ edges, style, ...props }: SafeAreaViewProps) {
  const insideTabBar = useContext(InsideTabBarContext);
  // The recovery screen can stand above the app's safe area provider.
  const insetTop = useContext(SafeAreaInsetsContext)?.top ?? 0;
  const ref = useRef<View>(null);
  const chosen = edges ?? (insideTabBar ? tabEdges : allEdges);
  const keepsTop = Array.isArray(chosen) ? chosen.includes("top") : "top" in chosen;
  const frame: ScreenFrame = {
    ref,
    left: paddingOf(style, "Left", spacing.lg),
    top: paddingOf(style, "Top", spacing.lg) + (keepsTop ? insetTop : 0),
  };

  return (
    <ScreenFrameContext.Provider value={frame}>
      <SafeAreaView
        {...props}
        edges={chosen}
        ref={ref}
        style={[styles.screen, insideTabBar && styles.insideTabBar, style]}
      />
    </ScreenFrameContext.Provider>
  );
}

/**
 * For a scroll view that holds the header band: it lets the band reach past
 * its edges to the screen's, as the boards draw it.
 */
export const bandScroll = StyleSheet.create({ scroll: { overflow: "visible" } }).scroll;

const styles = StyleSheet.create({
  insideTabBar: { paddingBottom: 0 },
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
    padding: spacing.lg,
  },
});
