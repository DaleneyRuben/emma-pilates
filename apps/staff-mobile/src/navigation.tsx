import {
  AuthenticationFlow,
  type MobileNavigationProps,
  MobileQueryProvider,
  recoveryScreenLayout,
} from "@pilates/mobile-core";
import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { CancelClassScreen } from "./administrator/cancel-class-screen";
import { CancelSessionScreen } from "./administrator/cancel-session-screen";
import { PendingPaymentsScreen } from "./administrator/pending-payments-screen";
import { ReviewPaymentScreen } from "./administrator/review-payment-screen";
import { AssistantWorkspaceProvider } from "./assistant/assistant-workspace";
import { createCoordinatorStack } from "./coordinator/coordinator-stack";
import { AssistantRescheduleScreen } from "./assistant/assistant-reschedule-screen";
import { AssistantSessionDetailScreen } from "./assistant/assistant-session-detail-screen";
import { BrowseSessionsScreen } from "./assistant/browse-sessions-screen";
import { ClientBookingsScreen } from "./assistant/client-bookings-screen";
import { ClientHistoryScreen } from "./assistant/client-history-screen";
import { ClientOverviewScreen } from "./assistant/client-overview-screen";
import { ClientSearchScreen } from "./assistant/client-search-screen";
import { ConfirmCashPaymentScreen } from "./assistant/confirm-cash-payment-screen";
import { CashCloseScreen } from "./cash-close/cash-close-screen";
import { NewClientScreen } from "./assistant/new-client-screen";
import { SelectPlanScreen } from "./assistant/select-plan-screen";
import {
  ImpersonationBanner,
  impersonationBannerHeight,
} from "./impersonation/impersonation-banner";
import { createImpersonationApi } from "./impersonation/impersonation-api";
import {
  ImpersonationContext,
  type ImpersonationNotice,
} from "./impersonation/impersonation-context";
import { ViewAsScreen } from "./impersonation/view-as-screen";
import { AvailabilityBlockFormScreen } from "./nutritionist/availability-block-form-screen";
import { AvailabilityScreen } from "./nutritionist/availability-screen";
import type { StaffRole } from "./notifications/notification-destinations";
import { StaffPushNotifications } from "./notifications/staff-push-notifications";
import { NutritionistAgendaScreen } from "./nutritionist/nutritionist-agenda-screen";
import { StaffChangePasswordScreen } from "./profile/staff-change-password-screen";
import { StaffFeedbackScreen } from "./profile/staff-feedback-screen";
import { StaffNotificationsScreen } from "./profile/staff-notifications-screen";
import { StaffProfileScreen } from "./profile/staff-profile-screen";
import { ReportFaultScreen } from "./trainer/report-fault-screen";
import { TrainerAgendaScreen } from "./trainer/trainer-agenda-screen";
import { TrainerRosterScreen } from "./trainer/trainer-roster-screen";
import { StaffFetcherContext, unavailableFetcher } from "./staff-fetcher";
import { StaffRoleContext } from "./staff-role";

const accountScreens = {
  Profile: StaffProfileScreen,
  Notifications: StaffNotificationsScreen,
  ChangePassword: StaffChangePasswordScreen,
  Feedback: StaffFeedbackScreen,
};

const TrainerStack = createNativeStackNavigator({
  screenLayout: recoveryScreenLayout,
  screenOptions: { headerShown: false },
  screens: {
    Agenda: TrainerAgendaScreen,
    Roster: TrainerRosterScreen,
    ReportFault: ReportFaultScreen,
    ...accountScreens,
  },
});
const AssistantStack = createNativeStackNavigator({
  screenLayout: recoveryScreenLayout,
  screenOptions: { headerShown: false },
  screens: {
    ClientSearch: ClientSearchScreen,
    NewClient: NewClientScreen,
    ClientOverview: ClientOverviewScreen,
    BrowseSessions: BrowseSessionsScreen,
    SessionDetail: AssistantSessionDetailScreen,
    SelectPlan: SelectPlanScreen,
    ConfirmCashPayment: ConfirmCashPaymentScreen,
    ClientBookings: ClientBookingsScreen,
    Reschedule: AssistantRescheduleScreen,
    ClientHistory: ClientHistoryScreen,
    CashClose: CashCloseScreen,
    ...accountScreens,
  },
});
const AdministratorStack = createNativeStackNavigator({
  screenLayout: recoveryScreenLayout,
  screenOptions: { headerShown: false },
  screens: {
    Payments: PendingPaymentsScreen,
    ReviewPayment: ReviewPaymentScreen,
    CancelClass: CancelClassScreen,
    CancelSession: CancelSessionScreen,
    ViewAs: ViewAsScreen,
    CashClose: CashCloseScreen,
    ...accountScreens,
  },
});
const NutritionistStack = createNativeStackNavigator({
  screenLayout: recoveryScreenLayout,
  screenOptions: { headerShown: false },
  screens: {
    Agenda: NutritionistAgendaScreen,
    Availability: AvailabilityScreen,
    AvailabilityBlockForm: AvailabilityBlockFormScreen,
    ...accountScreens,
  },
});
const roleNavigation: Record<StaffRole, ReturnType<typeof createStaticNavigation>> = {
  administrator: createStaticNavigation(AdministratorStack),
  assistant: createStaticNavigation(AssistantStack),
  coordinator: createStaticNavigation(createCoordinatorStack(accountScreens)),
  nutritionist: createStaticNavigation(NutritionistStack),
  trainer: createStaticNavigation(TrainerStack),
};

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
