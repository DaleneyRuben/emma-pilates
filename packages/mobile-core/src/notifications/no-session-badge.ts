import { useEffect } from "react";
import { AppState } from "react-native";

import type { PushPlatform } from "./push-platform";

// ADR-0069: the badge is the signed-in Account's unread count, so with nobody
// signed in it is always empty, even if a push sent before sign-out arrives.
export function useClearBadgeWithoutSession({
  platform,
  signedIn,
}: {
  platform?: PushPlatform;
  signedIn: boolean;
}): void {
  useEffect(() => {
    if (platform === undefined || signedIn) return undefined;
    const clear = () => void platform.setBadgeCount(0);
    clear();
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") clear();
    });
    const removeReceivedListener = platform.onNotificationReceived(clear);
    return () => {
      appState.remove();
      removeReceivedListener();
    };
  }, [platform, signedIn]);
}
