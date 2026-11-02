import { createContext, type ReactNode, useContext } from "react";
import { StyleSheet } from "react-native";
import { type Edge, SafeAreaView, type SafeAreaViewProps } from "react-native-safe-area-context";

import { colors, spacing } from "./tokens";

const allEdges: readonly Edge[] = ["top", "right", "bottom", "left"];
const tabEdges: readonly Edge[] = ["top", "right", "left"];

const InsideTabBarContext = createContext(false);

// FIX-023: the tab bar already covers the bottom safe area, so the apps wrap
// every tab screen in this to keep Screen from adding it a second time.
export function InsideTabBar({ children }: { children: ReactNode }) {
  return <InsideTabBarContext.Provider value>{children}</InsideTabBarContext.Provider>;
}

export function Screen({ edges, style, ...props }: SafeAreaViewProps) {
  const insideTabBar = useContext(InsideTabBarContext);

  return (
    <SafeAreaView
      {...props}
      edges={edges ?? (insideTabBar ? tabEdges : allEdges)}
      style={[styles.screen, insideTabBar && styles.insideTabBar, style]}
    />
  );
}

const styles = StyleSheet.create({
  insideTabBar: { paddingBottom: 0 },
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
    padding: spacing.lg,
  },
});
