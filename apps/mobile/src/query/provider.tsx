import NetInfo from "@react-native-community/netinfo";
import {
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import { type PropsWithChildren, useEffect } from "react";
import { AppState } from "react-native";

import { createMobileQueryClient } from "./client";

const queryClient = createMobileQueryClient();

export function clearMobileQueryCache(): void {
  queryClient.clear();
}

export function MobileQueryProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    if (AppState === undefined || NetInfo === undefined) {
      return undefined;
    }

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        focusManager.setFocused(state === "active");
      },
    );
    const networkSubscription = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(state.isConnected === true);
    });

    return () => {
      appStateSubscription.remove();
      networkSubscription();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
