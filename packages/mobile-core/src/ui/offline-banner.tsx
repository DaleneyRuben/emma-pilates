import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "./text";
import { colors, spacing } from "./tokens";

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(() => onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setOnline), []);

  return online;
}

/**
 * FIX-090: true while a query on a mounted screen last failed to connect
 * (fetch rejects with a network TypeError; a bug's TypeError does not count). The device can report a network while
 * the API is out of reach; an answer from the API, even an error, means it
 * is reachable.
 */
// What fetch says when it cannot reach a server: React Native, browsers, Node.
const networkFailure = /network request failed|failed to fetch|fetch failed|load failed/i;

const failedToConnect = (error: unknown) =>
  error instanceof TypeError && networkFailure.test(error.message);

function useApiUnreachable(): boolean {
  const queryClient = useQueryClient();
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    const check = () =>
      setUnreachable(
        cache
          .getAll()
          .some(
            (query) =>
              query.getObserversCount() > 0 &&
              query.state.status === "error" &&
              failedToConnect(query.state.error),
          ),
      );
    check();
    return cache.subscribe(check);
  }, [queryClient]);

  return unreachable;
}

/** The one «Sin conexión» banner, above every screen of both apps: white `cuerpo` on 600. */
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
        <Text style={styles.text} tone="onDark" variant="cuerpo">
          Sin conexión. Mostrando la última información guardada.
        </Text>
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
  text: { textAlign: "center" },
});
