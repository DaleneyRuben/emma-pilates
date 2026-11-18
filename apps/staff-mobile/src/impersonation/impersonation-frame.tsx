import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { impersonationBannerHeight } from "./impersonation-banner";

export function ImpersonationFrame({ banner, children }: { banner: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.frame}>
      <View
        style={[styles.frame, { paddingTop: insets.top + impersonationBannerHeight }]}
        testID="impersonation-screens"
      >
        {children}
      </View>
      {banner}
    </View>
  );
}

const styles = StyleSheet.create({ frame: { flex: 1 } });
