import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { impersonationBannerHeight } from "./impersonation-banner";

/**
 * FUT-001: the screens start under the banner, which covers the status bar.
 * Walkthrough finding 115: a screen's own safe area (Screen's SafeAreaView,
 * which reads its nearest provider) must then count no top inset, or the
 * status bar is left blank a second time under the banner. A provider of
 * their own, laid out below the banner, measures none on the device; its
 * first frame starts from the same figures.
 */
export function ImpersonationFrame({
  banner,
  children,
}: {
  banner: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  const pushedDown = insets.top + impersonationBannerHeight;
  const underBanner = {
    frame: { ...frame, y: frame.y + pushedDown, height: Math.max(0, frame.height - pushedDown) },
    insets: { ...insets, top: 0 },
  };
  return (
    <View style={styles.frame}>
      <View style={[styles.frame, { paddingTop: pushedDown }]} testID="impersonation-screens">
        <SafeAreaProvider initialMetrics={underBanner} style={styles.frame}>
          {children}
        </SafeAreaProvider>
      </View>
      {banner}
    </View>
  );
}

const styles = StyleSheet.create({ frame: { flex: 1 } });
