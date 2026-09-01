import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useMemo } from "react";

import {
  MobileIdentityProvider,
  useMobileIdentity,
} from "./src/auth/identity-provider";
import { createSessionApi } from "./src/auth/session-api";
import {
  createSessionManager,
  type SessionManager,
} from "./src/auth/session-manager";
import { credentialStore } from "./src/auth/credential-store";
import { getMobileApiBaseUrl } from "./src/config/runtime";
import type { LinkSource } from "./src/ingress/link-ingress";
import { VerifiedLinkProvider } from "./src/ingress/verified-link-provider";
import { fontAssets } from "./src/ui/fonts";
import { MobileNavigation } from "./src/navigation";
import { clearPersistedAccountCache } from "./src/query/persistence";
import {
  clearMobileQueryCache,
  MobileQueryProvider,
} from "./src/query/provider";

type MobileRuntime = {
  allowedLinkHosts: readonly string[];
  linkSource?: LinkSource;
  sessionManager: SessionManager;
};

function createDefaultRuntime(): MobileRuntime {
  const apiBaseUrl = getMobileApiBaseUrl(
    { EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL },
    __DEV__,
  );
  const sessionApi = createSessionApi({ baseUrl: apiBaseUrl });

  async function clearAccountCache(accountId: string): Promise<void> {
    clearMobileQueryCache();
    await clearPersistedAccountCache(accountId);
  }

  return {
    allowedLinkHosts: [new URL(apiBaseUrl).hostname],
    sessionManager: createSessionManager({
      clearAccountCache,
      credentialStore,
      resolveCurrent: sessionApi.resolveCurrent,
      revokeCurrent: sessionApi.revokeCurrent,
    }),
  };
}

function IdentityNavigation() {
  const identity = useMobileIdentity();

  if (identity.status === "restoring") {
    return null;
  }

  return <MobileNavigation role={identity.session?.role} />;
}

export default function App({ runtime }: { runtime?: MobileRuntime }) {
  const [fontsLoaded] = useFonts(fontAssets);
  const mobileRuntime = useMemo(
    () => runtime ?? createDefaultRuntime(),
    [runtime],
  );

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <MobileQueryProvider>
        <VerifiedLinkProvider
          allowedHosts={mobileRuntime.allowedLinkHosts}
          source={mobileRuntime.linkSource}
        >
          <MobileIdentityProvider manager={mobileRuntime.sessionManager}>
            <IdentityNavigation />
          </MobileIdentityProvider>
        </VerifiedLinkProvider>
      </MobileQueryProvider>
      <StatusBar style="auto" />
    </>
  );
}
