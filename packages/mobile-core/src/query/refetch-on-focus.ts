import { NavigationContext } from "@react-navigation/native";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useContext, useEffect, useRef } from "react";

/**
 * UX-004: a screen that stays mounted (a tab, or a stack screen under a pushed
 * one) refetches its queries when react-navigation focuses it again. Only a
 * focus after a blur counts, so the first fetch stays `refetchOnMount`'s and
 * nothing fetches twice on mount. The refetch is a background invalidation:
 * the data on screen stays until the fresh answer replaces it. Outside a
 * navigator (the unit specs) the hook does nothing.
 */
export function useRefetchOnFocus(queryKeys: readonly QueryKey[]): void {
  const navigation = useContext(NavigationContext);
  const queryClient = useQueryClient();
  const latestKeys = useRef(queryKeys);

  useEffect(() => {
    latestKeys.current = queryKeys;
  }, [queryKeys]);

  useEffect(() => {
    if (navigation === undefined) return undefined;
    let blurred = false;
    const unsubscribeBlur = navigation.addListener("blur", () => {
      blurred = true;
    });
    const unsubscribeFocus = navigation.addListener("focus", () => {
      if (!blurred) return;
      blurred = false;
      latestKeys.current.forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey });
      });
    });
    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
    };
  }, [navigation, queryClient]);
}
