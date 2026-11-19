import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fontFamilies } from "./fonts";
import { colors, spacing, typography } from "./tokens";

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(() => onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setOnline), []);

  return online;
}

/**
 * FIX-090: true once a request fails to connect (fetch rejects with a
 * TypeError) and until one gets through. The device can report a network
 * while the API is out of reach; an answer from the API, even an error,
 * means it is reachable.
 */
function useApiUnreachable(): boolean {
  const queryClient = useQueryClient();
  const [unreachable, setUnreachable] = useState(false);

  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== "updated") return;
        if (event.action.type === "error") {
          setUnreachable(event.action.error instanceof TypeError);
        } else if (event.action.type === "success") {
          setUnreachable(false);
        }
      }),
    [queryClient],
  );

  return unreachable;
}

/** The one «Sin conexión» banner, above every screen of both apps. */
export function OfflineBanner() {
  const online = useIsOnline();
  const unreachable = useApiUnreachable();

  if (online && !unreachable) return null;

  // Walkthrough n.º 71: the banner sits above the screens, so it keeps the
  // clock and the island clear itself; the screens below then measure no
  // top inset of their own.
  return (
    <SafeAreaView edges={["top"]} style={styles.area}>
      <View accessibilityRole="alert" style={styles.banner}>
        <Text style={styles.text}>Sin conexión. Mostrando la última información guardada.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  area: { backgroundColor: colors.primary },
  banner: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.note,
    fontWeight: "500",
  },
});
