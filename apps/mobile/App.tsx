import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useCallback, useMemo } from "react";

import {
  MobileIdentityProvider,
  useMobileIdentity,
} from "./src/auth/identity-provider";
import type { LoginValues } from "./src/auth/login-screen";
import {
  createSessionApi,
  type SessionLoginResult,
} from "./src/auth/session-api";
import {
  createSessionManager,
  type SessionManager,
} from "./src/auth/session-manager";
import { credentialStore } from "./src/auth/credential-store";
import {
  getMobileApiBaseUrl,
  getOrCreateInstallationIdentifier,
} from "./src/config/runtime";
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
  login: (values: LoginValues) => Promise<SessionLoginResult>;
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
    async login({ email, password }) {
      const clientIdentifier = await getOrCreateInstallationIdentifier(
        AsyncStorage,
        randomUUID,
      );

      return sessionApi.login({ clientIdentifier, email, password });
    },
    sessionManager: createSessionManager({
      clearAccountCache,
      credentialStore,
      resolveCurrent: sessionApi.resolveCurrent,
      revokeCurrent: sessionApi.revokeCurrent,
    }),
  };
}

function IdentityNavigation({
  login,
}: {
  login: MobileRuntime["login"];
}) {
  const identity = useMobileIdentity();
  const handleLogin = useCallback(
    async (values: LoginValues) => {
      const result = await login(values);

      if (result.status === "created") {
        await identity.start(result.credential);
      }
    },
    [identity, login],
  );

  if (identity.status === "restoring") {
    return null;
  }

  return (
    <MobileNavigation
      onBiometricUnlock={
        identity.status === "biometric-locked"
          ? identity.unlockWithBiometrics
          : undefined
      }
      onLogin={handleLogin}
      role={identity.session?.role}
    />
  );
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
            <IdentityNavigation login={mobileRuntime.login} />
          </MobileIdentityProvider>
        </VerifiedLinkProvider>
      </MobileQueryProvider>
      <StatusBar style="auto" />
    </>
  );
}
