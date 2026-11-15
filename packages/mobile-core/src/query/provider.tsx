import NetInfo from "@react-native-community/netinfo";
import { QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo } from "react";
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

// Walkthrough n.º 71: the signed-in provider sits inside the app-wide one,
// and only the outermost draws the offline banner.
const OfflineBannerShown = createContext(false);

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

  const bannerShown = useContext(OfflineBannerShown);
  const content = (
    <OfflineBannerShown.Provider value>
      {bannerShown ? null : <OfflineBanner />}
      {children}
    </OfflineBannerShown.Provider>
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
