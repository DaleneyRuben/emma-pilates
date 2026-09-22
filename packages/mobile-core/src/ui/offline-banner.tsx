import { onlineManager } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "./tokens";

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(() => onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setOnline), []);

  return online;
}

export function OfflineBanner() {
  const online = useIsOnline();

  if (online) return null;

  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <Text style={styles.text}>
        Sin conexión. Mostrando la última información guardada.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: { color: colors.white, fontSize: typography.note, fontWeight: "500" },
});
