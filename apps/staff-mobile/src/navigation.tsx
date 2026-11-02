import {
  AuthenticationFlow,
  type MobileNavigationProps,
  MobileQueryProvider,
} from "@pilates/mobile-core";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  ImpersonationBanner,
  impersonationBannerHeight,
} from "./impersonation/impersonation-banner";
import { createImpersonationApi } from "./impersonation/impersonation-api";
import {
  ImpersonationContext,
  type ImpersonationNotice,
} from "./impersonation/impersonation-context";
import { AssistantWorkspaceProvider } from "./assistant/assistant-workspace";
import { roleNavigation } from "./navigation/role-tabs";
import { StaffPushNotifications } from "./notifications/staff-push-notifications";
import { StaffFetcherContext, unavailableFetcher } from "./staff-fetcher";
import { StaffRoleContext } from "./staff-role";

// Jest has no native metrics; the device fills them in before the first frame.
const windowMetrics = initialWindowMetrics ?? {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

// FUT-001: the screens start under the strip, which covers the top inset.
function UnderBanner({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.pushedDown, { paddingTop: insets.top + impersonationBannerHeight }]}>
      {children}
    </View>
  );
}

export function StaffNavigation({
  accountId,
  apiFetcher,
  authenticationApi,
  authenticationIntent,
  impersonation,
  installationIdentifier,
  onBiometricUnlock,
  onLogin,
  onRecoveryCredential,
  pushPlatform,
  refreshSession,
  role,
}: MobileNavigationProps) {
  const fetcher = apiFetcher ?? unavailableFetcher;
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = useCallback(() => refreshSession?.() ?? Promise.resolve(), [refreshSession]);
  const leave = useCallback(
    async (line: ImpersonationNotice, end: boolean) => {
      const name = impersonation?.staffMemberName ?? "";
      if (end) {
        try {
          await createImpersonationApi(fetcher).end();
        } catch {
          // The row may already have ended on the server; the refresh tells.
        }
      }
      setNotice(`${line} ${name}.`);
      await refresh();
    },
    [fetcher, impersonation?.staffMemberName, refresh],
  );
  const onExit = useCallback(() => void leave("Dejaste de ver la app como", true), [leave]);
  const onExpire = useCallback(
    () => void leave("Terminó el tiempo para ver la app como", false),
    [leave],
  );
  const clearNotice = useCallback(() => setNotice(null), []);
  const impersonationState = useMemo(
    () => ({ impersonation: impersonation ?? null, notice, clearNotice, refreshSession: refresh }),
    [clearNotice, impersonation, notice, refresh],
  );

  if (role !== undefined && role !== "client") {
    const AuthenticatedStaffNavigation = roleNavigation[role];
    const navigator = (
      <StaffPushNotifications
        fetcher={fetcher}
        installationIdentifier={installationIdentifier}
        platform={pushPlatform}
        registrationEnabled={impersonation === undefined}
        role={role}
      >
        {({ onReady, ref }) => <AuthenticatedStaffNavigation onReady={onReady} ref={ref} />}
      </StaffPushNotifications>
    );
    return (
      <MobileQueryProvider accountId={accountId}>
        <StaffFetcherContext.Provider value={fetcher}>
          <AssistantWorkspaceProvider>
            <StaffRoleContext.Provider value={role}>
              <ImpersonationContext.Provider value={impersonationState}>
                {impersonation === undefined ? (
                  navigator
                ) : (
                  <SafeAreaProvider initialMetrics={windowMetrics} style={styles.underBanner}>
                    <UnderBanner>{navigator}</UnderBanner>
                    <ImpersonationBanner
                      impersonation={impersonation}
                      onExit={onExit}
                      onExpire={onExpire}
                    />
                  </SafeAreaProvider>
                )}
              </ImpersonationContext.Provider>
            </StaffRoleContext.Provider>
          </AssistantWorkspaceProvider>
        </StaffFetcherContext.Provider>
      </MobileQueryProvider>
    );
  }
  return (
    <AuthenticationFlow
      allowClientRegistration={false}
      api={authenticationApi}
      intent={authenticationIntent?.type === "verify-email" ? null : authenticationIntent}
      onBiometricUnlock={onBiometricUnlock}
      onLogin={onLogin}
      onRecoveryCredential={onRecoveryCredential}
    />
  );
}
const styles = StyleSheet.create({
  pushedDown: { flex: 1 },
  underBanner: { flex: 1 },
});
