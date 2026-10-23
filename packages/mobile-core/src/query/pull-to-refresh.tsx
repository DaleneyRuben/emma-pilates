import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, type RefreshControlProps } from "react-native";

import { colors } from "../ui/tokens";

/**
 * UX-004: the one pull-to-refresh control every list draws, in Palo de rosa on
 * iOS (`tintColor`) and Android (`colors`). A pull refetches the screen's
 * active queries and spins until they answer; the list stays on screen.
 */
export function usePullToRefresh(
  queryKeys: readonly QueryKey[],
): ReactElement<RefreshControlProps> {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const latestKeys = useRef(queryKeys);

  useEffect(() => {
    latestKeys.current = queryKeys;
  }, [queryKeys]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all(
        latestKeys.current.map((queryKey) =>
          queryClient.refetchQueries({ queryKey, type: "active" }),
        ),
      );
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  return (
    <RefreshControl
      colors={[colors.primary]}
      onRefresh={() => void refresh()}
      progressBackgroundColor={colors.white}
      refreshing={refreshing}
      tintColor={colors.primary}
    />
  );
}
