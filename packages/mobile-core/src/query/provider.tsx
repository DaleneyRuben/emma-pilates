import NetInfo from "@react-native-community/netinfo";
import { QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { type PropsWithChildren, useEffect, useMemo } from "react";
import { AppState } from "react-native";

import { OfflineBanner } from "../ui/offline-banner";
import { createMobileQueryClient } from "./client";
import {
  createMobilePersister,
  persistedCacheMaxAgeMilliseconds,
  persistedCacheVersion,
  shouldPersistQuery,
} from "./persistence";

const queryClient = createMobileQueryClient();

export function clearMobileQueryCache(): void {
  queryClient.clear();
}

type MobileQueryProviderProps = PropsWithChildren<{
  accountId?: string;
}>;

export function MobileQueryProvider({ accountId, children }: MobileQueryProviderProps) {
  useEffect(() => {
    if (AppState === undefined || NetInfo === undefined) {
      return undefined;
    }

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    const networkSubscription = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(state.isConnected === true);
    });

    return () => {
      appStateSubscription.remove();
      networkSubscription();
    };
  }, []);

  const persistOptions = useMemo(
    () =>
      accountId === undefined
        ? null
        : {
            buster: persistedCacheVersion,
            dehydrateOptions: {
              shouldDehydrateQuery: (query: {
                queryKey: readonly unknown[];
                state: { status: string };
              }) => query.state.status === "success" && shouldPersistQuery(query.queryKey),
            },
            maxAge: persistedCacheMaxAgeMilliseconds,
            persister: createMobilePersister(accountId),
          },
    [accountId],
  );

  const content = (
    <>
      <OfflineBanner />
      {children}
    </>
  );

  if (persistOptions === null) {
    return <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      key={accountId}
      persistOptions={persistOptions}
    >
      {content}
    </PersistQueryClientProvider>
  );
}
