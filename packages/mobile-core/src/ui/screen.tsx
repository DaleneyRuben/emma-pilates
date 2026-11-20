import {
  cloneElement,
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useMemo,
  useRef,
} from "react";
import {
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  type View,
  type ViewStyle,
} from "react-native";
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

function keepsTopEdge(edges: SafeAreaViewProps["edges"]): boolean {
  if (edges === undefined) return true;
  if (Array.isArray(edges)) return edges.includes("top");
  const top = (edges as Record<string, string | undefined>).top;
  return top !== undefined && top !== "off";
}

export function Screen({ edges, style, ...props }: SafeAreaViewProps) {
  const insideTabBar = useContext(InsideTabBarContext);
  // A screen inside another one (the iPad's client file beside the search)
  // starts at its parent's content: its band reaches up through the parent's
  // top padding instead of a safe area it does not overlap.
  const parent = useContext(ScreenFrameContext);
  // The recovery screen can stand above the app's safe area provider.
  const insetTop = useContext(SafeAreaInsetsContext)?.top ?? 0;
  const ref = useRef<View>(null);
  const chosen = edges ?? (insideTabBar ? tabEdges : allEdges);
  const left = paddingOf(style, "Left", spacing.lg);
  const reach = parent !== null ? parent.top : keepsTopEdge(chosen) ? insetTop : 0;
  const top = paddingOf(style, "Top", spacing.lg) + reach;
  const frame = useMemo<ScreenFrame>(() => ({ ref, left, top }), [left, top]);

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
 * For a scroll view that holds the header band, so the band reaches the
 * screen's top and side edges as the boards draw it. iOS lets the band
 * overflow the scroll view; Android clips whatever overflows a scroll view,
 * so there the scroll view itself reaches the edges and pads its content back.
 */
export function useBandScroll(): {
  contentContainerStyle: ViewStyle;
  refreshOffset: number;
  style: ViewStyle;
} {
  const frame = useContext(ScreenFrameContext);
  if (frame === null) return { contentContainerStyle: {}, refreshOffset: 0, style: {} };
  if (Platform.OS !== "android") {
    return { contentContainerStyle: {}, refreshOffset: 0, style: { overflow: "visible" } };
  }
  return {
    contentContainerStyle: { paddingHorizontal: frame.left, paddingTop: frame.top },
    refreshOffset: frame.top,
    style: { marginHorizontal: -frame.left, marginTop: -frame.top },
  };
}

const styles = StyleSheet.create({
  insideTabBar: { paddingBottom: 0 },
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
    padding: spacing.lg,
  },
});

/** A screen's scroll view whose content starts with the header band. */
export function BandScrollView({
  contentContainerStyle,
  refreshControl,
  style,
  ...props
}: ScrollViewProps) {
  const bleed = useBandScroll();
  return (
    <ScrollView
      {...props}
      contentContainerStyle={[bleed.contentContainerStyle, contentContainerStyle]}
      refreshControl={
        // The pull spinner starts under the status bar, not behind it.
        refreshControl === undefined || bleed.refreshOffset === 0
          ? refreshControl
          : cloneElement(refreshControl, { progressViewOffset: bleed.refreshOffset })
      }
      style={[bleed.style, style]}
    />
  );
}
