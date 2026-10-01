import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { type ComponentType, useCallback, useMemo } from "react";

import {
  createAuthenticationApi,
  type AuthenticationApi,
} from "./auth/authentication-api";
import {
  MobileIdentityProvider,
  useMobileIdentity,
} from "./auth/identity-provider";
import type { LoginSubmissionResult, LoginValues } from "./auth/login-screen";
import type { PendingRegistrationStore } from "./auth/pending-registration-store";
import { createSessionApi, type SessionLoginResult } from "./auth/session-api";
import {
  createSessionManager,
  type AppRole,
  type SessionManager,
} from "./auth/session-manager";
import type { LinkSource } from "./ingress/link-ingress";
import type { AuthenticationLinkIntent } from "./ingress/verified-link";
import {
  useVerifiedLinkIntent,
  VerifiedLinkProvider,
} from "./ingress/verified-link-provider";
import {
  getMobileApiBaseUrl,
  getOrCreateInstallationIdentifier,
} from "./config/runtime";
import { createApiFetcher } from "./api/fetcher";
import { clearPersistedAccountCache } from "./query/persistence";
import { clearMobileQueryCache, MobileQueryProvider } from "./query/provider";
import { fontAssets } from "./ui/fonts";

export type MobileRuntime = {
  allowedLinkHosts: readonly string[];
  // Where public image URLs answered as API paths resolve (ADR-0077 locally).
  apiBaseUrl?: string;
  apiFetcher?: typeof globalThis.fetch;
  authenticationApi: AuthenticationApi;
  linkSource?: LinkSource;
  login: (values: LoginValues) => Promise<SessionLoginResult>;
  pendingRegistrationStore?: PendingRegistrationStore;
  sessionManager: SessionManager;
};

export type MobileNavigationProps = {
  accountId?: string;
  authenticationApi: AuthenticationApi;
  authenticationIntent: AuthenticationLinkIntent | null;
  apiBaseUrl?: string;
  apiFetcher?: typeof globalThis.fetch;
  onBiometricUnlock?: () => void;
  onLogin: (values: LoginValues) => Promise<LoginSubmissionResult | void>;
  onRecoveryCredential: (credential: string) => Promise<void>;
  /** The Client app keeps «Revisa tu correo» across launches (MOB-028). */
  pendingRegistrationStore?: PendingRegistrationStore;
  role?: AppRole;
  /** The login screen's one-time notice, such as after closing the Account. */
  signOutNotice?: string | null;
};

export function createDefaultMobileRuntime({
  acceptedIdentityKind,
  credentialStore,
  pendingRegistrationStore,
}: {
  acceptedIdentityKind: "client" | "staff";
  credentialStore: Parameters<
    typeof createSessionManager
  >[0]["credentialStore"];
  pendingRegistrationStore?: PendingRegistrationStore;
}): MobileRuntime {
  const apiBaseUrl = getMobileApiBaseUrl(
    { EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL },
    __DEV__,
  );
  const sessionApi = createSessionApi({ baseUrl: apiBaseUrl });
  const installationIdentifier = () =>
    getOrCreateInstallationIdentifier(AsyncStorage, randomUUID);

  async function clearAccountCache(accountId: string): Promise<void> {
    clearMobileQueryCache();
    await clearPersistedAccountCache(accountId);
  }

  return {
    allowedLinkHosts: [new URL(apiBaseUrl).hostname],
    apiBaseUrl,
    apiFetcher: createApiFetcher({
      baseUrl: apiBaseUrl,
      getCredential: credentialStore.load,
    }),
    authenticationApi: createAuthenticationApi({
      baseUrl: apiBaseUrl,
      clientIdentifier: installationIdentifier,
    }),
    async login({ email, password }) {
      const clientIdentifier = await installationIdentifier();

      return sessionApi.login({ clientIdentifier, email, password });
    },
    pendingRegistrationStore,
    sessionManager: createSessionManager({
      acceptedIdentityKind,
      clearAccountCache,
      credentialStore,
      resolveCurrent: sessionApi.resolveCurrent,
      revokeCurrent: sessionApi.revokeCurrent,
    }),
  };
}

function IdentityNavigation({
  Navigation,
  authenticationApi,
  apiBaseUrl,
  apiFetcher,
  login,
  pendingRegistrationStore,
}: {
  Navigation: ComponentType<MobileNavigationProps>;
  authenticationApi: AuthenticationApi;
  apiBaseUrl?: string;
  apiFetcher?: typeof globalThis.fetch;
  login: MobileRuntime["login"];
  pendingRegistrationStore?: PendingRegistrationStore;
}) {
  const identity = useMobileIdentity();
  const { intent } = useVerifiedLinkIntent();
  const handleLogin = useCallback(
    async (values: LoginValues) => {
      const result = await login(values);

      if (result.status === "created") {
        await identity.start(result.credential);
        return undefined;
      }

      return result;
    },
    [identity, login],
  );

  if (identity.status === "restoring") {
    return null;
  }

  return (
    <Navigation
      accountId={identity.session?.accountId}
      authenticationApi={authenticationApi}
      authenticationIntent={intent}
      apiBaseUrl={apiBaseUrl}
      apiFetcher={apiFetcher}
      onBiometricUnlock={
        identity.status === "biometric-locked"
          ? identity.unlockWithBiometrics
          : undefined
      }
      onLogin={handleLogin}
      onRecoveryCredential={identity.start}
      pendingRegistrationStore={pendingRegistrationStore}
      role={identity.session?.role}
      signOutNotice={identity.signOutNotice}
    />
  );
}

export function MobileApplication({
  Navigation,
  runtime,
}: {
  Navigation: ComponentType<MobileNavigationProps>;
  runtime: MobileRuntime;
}) {
  const [fontsLoaded] = useFonts(fontAssets);
  const mobileRuntime = useMemo(() => runtime, [runtime]);

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
            <IdentityNavigation
              Navigation={Navigation}
              authenticationApi={mobileRuntime.authenticationApi}
              apiBaseUrl={mobileRuntime.apiBaseUrl}
              apiFetcher={mobileRuntime.apiFetcher}
              login={mobileRuntime.login}
              pendingRegistrationStore={mobileRuntime.pendingRegistrationStore}
            />
          </MobileIdentityProvider>
        </VerifiedLinkProvider>
      </MobileQueryProvider>
      <StatusBar style="auto" />
    </>
  );
}
