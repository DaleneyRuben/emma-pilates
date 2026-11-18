import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

const retryMilliseconds = 15_000;

/**
 * Walkthrough finding 99: when the API is down but the phone's network is up,
 * Inicio shows its saved data under «Sin conexión», and nothing would ask the
 * server again: no reconnect event comes, because the network never changed.
 * While that banner shows, ask again every few seconds and whenever the app
 * comes back to the foreground; the first good answer takes the banner away.
 */
export function useRetryCachedHome(
  showingCachedHome: boolean,
  queryKeys: readonly QueryKey[],
  everyMilliseconds = retryMilliseconds,
): void {
  const queryClient = useQueryClient();
  const latestKeys = useRef(queryKeys);

  useEffect(() => {
    latestKeys.current = queryKeys;
  }, [queryKeys]);

  useEffect(() => {
    if (!showingCachedHome) return undefined;
    const retry = () => {
      latestKeys.current.forEach((queryKey) => {
        // A slow answer still in flight is left to finish, not restarted.
        void queryClient.refetchQueries({ queryKey, type: "active" }, { cancelRefetch: false });
      });
    };
    const timer = setInterval(retry, everyMilliseconds);
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") retry();
    });
    return () => {
      clearInterval(timer);
      foreground.remove();
    };
  }, [everyMilliseconds, queryClient, showingCachedHome]);
}
