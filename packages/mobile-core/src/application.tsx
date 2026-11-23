import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import { type ComponentType, useCallback, useMemo } from "react";

import { createAuthenticationApi, type AuthenticationApi } from "./auth/authentication-api";
import { createBiometricKeyApi } from "./auth/biometric-key-api";
import { BiometricOffer } from "./auth/biometric-offer";
import { MobileIdentityProvider, useMobileIdentity } from "./auth/identity-provider";
import type { BiometricLock, LoginSubmissionResult, LoginValues } from "./auth/login-screen";
import type { PendingRegistrationStore } from "./auth/pending-registration-store";
import { createSessionApi, type SessionLoginResult } from "./auth/session-api";
import {
  createSessionManager,
  type AppRole,
  type MobileImpersonation,
  type SessionManager,
} from "./auth/session-manager";
import type { LinkSource } from "./ingress/link-ingress";
import { createExpoPushPlatform } from "./notifications/expo-push-platform";
import type { PushPlatform } from "./notifications/push-platform";
import type { AuthenticationLinkIntent } from "./ingress/verified-link";
import { useVerifiedLinkIntent, VerifiedLinkProvider } from "./ingress/verified-link-provider";
import {
  getAllowedLinkHosts,
  getMobileApiBaseUrl,
  getOrCreateInstallationIdentifier,
} from "./config/runtime";
import { createApiFetcher } from "./api/fetcher";
import { clearPersistedAccountCache } from "./query/persistence";
import { clearMobileQueryCache, MobileQueryProvider } from "./query/provider";
import { fontAssets } from "./ui/fonts";
import { useReleaseLaunchSplash } from "./ui/launch-splash";
import { RenderErrorBoundary } from "./ui/render-error-boundary";

export type MobileRuntime = {
  allowedLinkHosts: readonly string[];
  /** The Account kind whose link prefix this app claims (ADR-0095). */
  linkIdentityKind: "client" | "staff";
  // Where public image URLs answered as API paths resolve (ADR-0077 locally).
  apiBaseUrl?: string;
  apiFetcher?: typeof globalThis.fetch;
  authenticationApi: AuthenticationApi;
  /** The stable per-installation id; push registration sends it (NOT-002). */
  installationIdentifier?: () => Promise<string>;
  linkSource?: LinkSource;
  login: (values: LoginValues) => Promise<SessionLoginResult>;
  pendingRegistrationStore?: PendingRegistrationStore;
  /** Absent in tests and wherever push is unavailable. */
  pushPlatform?: PushPlatform;
  sessionManager: SessionManager;
};

export type MobileNavigationProps = {
  accountId?: string;
  authenticationApi: AuthenticationApi;
  authenticationIntent: AuthenticationLinkIntent | null;
  apiBaseUrl?: string;
  apiFetcher?: typeof globalThis.fetch;
  /** FUT-001: set while an Administrator sees the Staff app as a Staff Member. */
  impersonation?: MobileImpersonation;
  installationIdentifier?: () => Promise<string>;
  /** Set while a biometric key waits on this phone (ADR-0112). */
  biometricLock?: BiometricLock;
  onLogin: (values: LoginValues) => Promise<LoginSubmissionResult | void>;
  onRecoveryCredential: (credential: string) => Promise<void>;
  /** The Client app keeps «Revisa tu correo» across launches (MOB-028). */
  pendingRegistrationStore?: PendingRegistrationStore;
  pushPlatform?: PushPlatform;
  /** Resolves the session again after an Impersonation starts or ends (FUT-001). */
  refreshSession?: () => Promise<void>;
  role?: AppRole;
  /** The login screen's one-time notice, such as after closing the Account. */
  signOutNotice?: string | null;
};

// Sign-in stands outside the navigators' own safe area: the app provides one
// so its header band clears the status bar. Jest has no native metrics.
const windowMetrics = initialWindowMetrics ?? {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

export function createDefaultMobileRuntime({
  acceptedIdentityKind,
  credentialStore,
  pendingRegistrationStore,
}: {
  acceptedIdentityKind: "client" | "staff";
  credentialStore: Parameters<typeof createSessionManager>[0]["credentialStore"];
  pendingRegistrationStore?: PendingRegistrationStore;
}): MobileRuntime {
  const apiBaseUrl = getMobileApiBaseUrl(
    { EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL },
    __DEV__,
  );
  const sessionApi = createSessionApi({ baseUrl: apiBaseUrl });
  const installationIdentifier = () => getOrCreateInstallationIdentifier(AsyncStorage, randomUUID);

  async function clearAccountCache(accountId: string): Promise<void> {
    clearMobileQueryCache();
    await clearPersistedAccountCache(accountId);
  }

  const sessionManager = createSessionManager({
    acceptedIdentityKind,
    biometricKeys: createBiometricKeyApi({ baseUrl: apiBaseUrl }),
    clearAccountCache,
    credentialStore,
    installationIdentifier,
    resolveCurrent: sessionApi.resolveCurrent,
    revokeCurrent: sessionApi.revokeCurrent,
  });

  return {
    allowedLinkHosts: getAllowedLinkHosts(apiBaseUrl),
    linkIdentityKind: acceptedIdentityKind,
    apiBaseUrl,
    // The session manager's credential: the active one first, so a biometric
    // unlock is used even before the plain copy is written.
    apiFetcher: createApiFetcher({
      baseUrl: apiBaseUrl,
      getCredential: sessionManager.getCredential,
    }),
    authenticationApi: createAuthenticationApi({
      baseUrl: apiBaseUrl,
      clientIdentifier: installationIdentifier,
    }),
    installationIdentifier,
    async login({ email, password }) {
      const clientIdentifier = await installationIdentifier();

      return sessionApi.login({ clientIdentifier, email, password });
    },
    pendingRegistrationStore,
    pushPlatform: createExpoPushPlatform(),
    sessionManager,
  };
}

function IdentityNavigation({
  Navigation,
  authenticationApi,
  apiBaseUrl,
  apiFetcher,
  installationIdentifier,
  login,
  pendingRegistrationStore,
  pushPlatform,
}: {
  Navigation: ComponentType<MobileNavigationProps>;
  authenticationApi: AuthenticationApi;
  apiBaseUrl?: string;
  apiFetcher?: typeof globalThis.fetch;
  installationIdentifier?: () => Promise<string>;
  login: MobileRuntime["login"];
  pendingRegistrationStore?: PendingRegistrationStore;
  pushPlatform?: PushPlatform;
}) {
  const identity = useMobileIdentity();
  const { intent } = useVerifiedLinkIntent();
  // The fonts are loaded by now; once the session check has answered, the
  // first screen (Login or the saved session's) is drawn under the splash.
  useReleaseLaunchSplash(identity.status !== "restoring");
  const handleLogin = useCallback(
    async (values: LoginValues) => {
      const result = await login(values);

      if (result.status === "created") {
        await identity.start(result.credential, { offerBiometrics: true });
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
    <>
      <Navigation
        accountId={identity.session?.accountId}
        authenticationApi={authenticationApi}
        authenticationIntent={intent}
        apiBaseUrl={apiBaseUrl}
        apiFetcher={apiFetcher}
        impersonation={identity.session?.impersonation}
        installationIdentifier={installationIdentifier}
        biometricLock={
          identity.status === "biometric-locked"
            ? {
                autoPrompt: identity.biometrics.autoPrompt,
                error: identity.biometrics.unlockError,
                onUnlock: identity.unlockWithBiometrics,
                onUseAnotherAccount: identity.biometrics.useAnotherAccount,
              }
            : undefined
        }
        onLogin={handleLogin}
        onRecoveryCredential={identity.start}
        pendingRegistrationStore={pendingRegistrationStore}
        pushPlatform={pushPlatform}
        refreshSession={identity.refresh}
        role={identity.session?.role}
        signOutNotice={identity.signOutNotice}
      />
      <BiometricOffer />
    </>
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

  // The last resort for the authentication flow, the providers, and the
  // navigators' own chrome; each navigator wraps its screens on its own
  // (recoveryScreenLayout) so a failed screen keeps the navigator (MOB-053).
  return (
    <SafeAreaProvider initialMetrics={windowMetrics}>
      <RenderErrorBoundary>
        <MobileQueryProvider>
          <VerifiedLinkProvider
            allowedHosts={mobileRuntime.allowedLinkHosts}
            identityKind={mobileRuntime.linkIdentityKind}
            source={mobileRuntime.linkSource}
          >
            <MobileIdentityProvider manager={mobileRuntime.sessionManager}>
              <IdentityNavigation
                Navigation={Navigation}
                authenticationApi={mobileRuntime.authenticationApi}
                apiBaseUrl={mobileRuntime.apiBaseUrl}
                apiFetcher={mobileRuntime.apiFetcher}
                installationIdentifier={mobileRuntime.installationIdentifier}
                login={mobileRuntime.login}
                pendingRegistrationStore={mobileRuntime.pendingRegistrationStore}
                pushPlatform={mobileRuntime.pushPlatform}
              />
            </MobileIdentityProvider>
          </VerifiedLinkProvider>
        </MobileQueryProvider>
      </RenderErrorBoundary>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
