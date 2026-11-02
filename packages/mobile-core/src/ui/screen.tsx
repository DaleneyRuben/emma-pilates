import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView, type SafeAreaViewProps } from "react-native-safe-area-context";

import { colors, spacing } from "./tokens";

// Stub for FIX-023's red tests; the next commit makes it mark the tab screens.
export function InsideTabBar({ children }: { children: ReactNode }) {
  return children;
}

export function Screen({ style, ...props }: SafeAreaViewProps) {
  return <SafeAreaView {...props} style={[styles.screen, style]} />;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
    padding: spacing.lg,
  },
});
