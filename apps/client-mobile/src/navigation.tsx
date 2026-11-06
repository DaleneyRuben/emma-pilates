import {
  AuthenticationFlow,
  colors,
  EmailChangeLinkScreen,
  MobileQueryProvider,
  type MobileNavigationProps,
  createTabStackScreenLayout,
  popTabToRootOnPress,
  tabBarHidden,
  typography,
} from "@pilates/mobile-core";
import { getGetCurrentClientProfileQueryKey } from "@pilates/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStaticNavigation, getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { BookingsScreen } from "./booking/bookings-screen";
import { BrowseSessionsScreen } from "./booking/browse-sessions-screen";
import { RescheduleScreen } from "./booking/reschedule-screen";
import { SessionDetailScreen } from "./booking/session-detail-screen";
import { ClientApiBaseUrlContext, ClientFetcherContext } from "./client-fetcher";
import { ClientTabIcon, type ClientTabIconName } from "./client-tab-icon";
import { BookEvaluationScreen } from "./evaluations/book-evaluation-screen";
import { EvaluationAvailabilityScreen } from "./evaluations/evaluation-availability-screen";
import { MyEvaluationsScreen } from "./evaluations/my-evaluations-screen";
import { InvoiceDetailScreen } from "./invoices/invoice-detail-screen";
import { MyInvoicesScreen } from "./invoices/my-invoices-screen";
import { HomeScreen } from "./home/home-screen";
import { ClientPushNotifications } from "./notifications/client-push-notifications";
import { PaymentScreen } from "./payments/payment-screen";
import { ReferralsScreen } from "./payments/referrals-screen";
import { PaymentStatusScreen } from "./payments/payment-status-screen";
import { PlanDetailScreen } from "./plans/plan-detail-screen";
import { PlansScreen } from "./plans/plans-screen";
import { ClientChangePasswordScreen } from "./profile/change-password-screen";
import { ClientFeedbackScreen } from "./profile/feedback-screen";
import { CloseAccountScreen } from "./profile/close-account-screen";
import { EditProfileScreen } from "./profile/edit-profile-screen";
import { ClientNotificationsScreen } from "./profile/notifications-screen";
import { ProfileScreen } from "./profile/profile-screen";
import { SubscriptionScreen } from "./subscription/subscription-screen";

const unavailableFetcher: typeof globalThis.fetch = async () => {
  throw new Error("The authenticated API fetcher is unavailable");
};

// Design follow-up 254 § 3 (owner, 2026-11-06): the bar stays on browsing
// screens (class detail, Mi plan, Mis facturas, Notificaciones, Mis
// evaluaciones) and hides only inside these tasks.
const taskRoutes: ReadonlySet<string> = new Set([
  // Buying a plan: choose, start date and invoice, pay, upload the receipt
  "Plans",
  "PlanDetail",
  "Payment",
  "PaymentStatus",
  // Booking an evaluation
  "EvaluationAvailability",
  "BookEvaluation",
  "Reschedule",
  "EditProfile",
  "ChangePassword",
  "Feedback",
  "CloseAccount",
]);

// FIX-023: a screen over the tab bar drops the bottom safe area; a task,
// which hides the bar, keeps it.
const screenLayout = createTabStackScreenLayout(taskRoutes);

// Plan and Subscription screens are reachable from Home, Reservar, and Perfil.
const planScreens = {
  Plans: PlansScreen,
  PlanDetail: PlanDetailScreen,
  Payment: PaymentScreen,
  PaymentStatus: PaymentStatusScreen,
  Subscription: SubscriptionScreen,
};

// Evaluation and Referral screens open from Home's quick actions and Perfil.
const shortcutScreens = {
  EvaluationAvailability: EvaluationAvailabilityScreen,
  BookEvaluation: BookEvaluationScreen,
  MyEvaluations: MyEvaluationsScreen,
  Referrals: ReferralsScreen,
  // FIX-044: «Mis facturas» opens from Perfil and from its notification.
  MyInvoices: MyInvoicesScreen,
  InvoiceDetail: InvoiceDetailScreen,
};

const HomeStack = createNativeStackNavigator({
  screenLayout,
  screenOptions: { headerShown: false },
  // Walkthrough n.º 11: the Inicio bell opens Notificaciones over Inicio.
  screens: {
    Home: HomeScreen,
    Notifications: ClientNotificationsScreen,
    ...planScreens,
    ...shortcutScreens,
  },
});

const BookingsStack = createNativeStackNavigator({
  screenLayout,
  screenOptions: { headerShown: false },
  screens: {
    MyBookings: BookingsScreen,
    Reschedule: RescheduleScreen,
  },
});

const BookingStack = createNativeStackNavigator({
  screenLayout,
  screenOptions: { headerShown: false },
  screens: {
    Browse: BrowseSessionsScreen,
    SessionDetail: SessionDetailScreen,
    ...planScreens,
  },
});

const ProfileStack = createNativeStackNavigator({
  screenLayout,
  screenOptions: { headerShown: false },
  screens: {
    Profile: ProfileScreen,
    EditProfile: EditProfileScreen,
    Notifications: ClientNotificationsScreen,
    ChangePassword: ClientChangePasswordScreen,
    Feedback: ClientFeedbackScreen,
    CloseAccount: CloseAccountScreen,
    ...shortcutScreens,
    ...planScreens,
  },
});

const tabBarStyle = { backgroundColor: colors.card, borderTopColor: colors.borderStrong };

const tabOptions =
  (title: string, icon: ClientTabIconName, root: string) =>
  ({ route }: { route: Parameters<typeof getFocusedRouteNameFromRoute>[0] }) => {
    const hidden = tabBarHidden(taskRoutes, getFocusedRouteNameFromRoute(route), root);
    return {
      tabBarButtonTestID: `tab-${icon}`,
      tabBarIcon: ({ color }: { color: string }) => <ClientTabIcon color={color} name={icon} />,
      tabBarStyle: hidden ? { display: "none" as const } : tabBarStyle,
      title,
    };
  };

const ClientTabs = createBottomTabNavigator({
  // Walkthrough n.º 28: tapping a tab opens it on its root screen.
  screenListeners: popTabToRootOnPress,
  // Labels stay under the icons on a tablet too.
  screenOptions: {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSubtle,
    tabBarLabelPosition: "below-icon",
    tabBarLabelStyle: { fontSize: typography.tabLabel },
  },
  screens: {
    HomeTab: { screen: HomeStack, options: tabOptions("Inicio", "home", "Home") },
    Booking: { screen: BookingStack, options: tabOptions("Reservar", "booking", "Browse") },
    Bookings: {
      screen: BookingsStack,
      options: tabOptions("Mis Reservas", "bookings", "MyBookings"),
    },
    // The owner removed the Perfil tab's unread pill (2026-11-02): it is on the Inicio bell.
    ProfileTab: { screen: ProfileStack, options: tabOptions("Perfil", "profile", "Profile") },
  },
});

const AuthenticatedClientNavigation = createStaticNavigation(ClientTabs);

// IDN-008: the link sent to the new address is confirmed here whether or not
// someone is signed in; a signed-in Client then sees the new email on Perfil.
function SignedInEmailChangeLink({
  api,
  onDone,
  token,
}: {
  api: MobileNavigationProps["authenticationApi"];
  onDone: () => void;
  token: string;
}) {
  const queryClient = useQueryClient();
  return (
    <EmailChangeLinkScreen
      api={api}
      onDone={(changed) => {
        if (changed) {
          void queryClient.invalidateQueries({
            queryKey: getGetCurrentClientProfileQueryKey(),
          });
        }
        onDone();
      }}
      token={token}
    />
  );
}

export function ClientNavigation({
  accountId,
  apiBaseUrl,
  apiFetcher,
  authenticationApi,
  authenticationIntent,
  installationIdentifier,
  onBiometricUnlock,
  onLogin,
  onRecoveryCredential,
  pendingRegistrationStore,
  pushPlatform,
  role,
  signOutNotice,
}: MobileNavigationProps) {
  const [handledLink, setHandledLink] = useState<string | null>(null);
  const emailChangeToken =
    authenticationIntent?.type === "confirm-email-change" &&
    authenticationIntent.token !== handledLink
      ? authenticationIntent.token
      : null;

  if (role === "client") {
    return (
      <MobileQueryProvider accountId={accountId}>
        <ClientFetcherContext.Provider value={apiFetcher ?? unavailableFetcher}>
          <ClientApiBaseUrlContext.Provider value={apiBaseUrl}>
            <ClientPushNotifications
              fetcher={apiFetcher ?? unavailableFetcher}
              installationIdentifier={installationIdentifier}
              platform={pushPlatform}
            >
              {({ onReady, ref }) =>
                emailChangeToken === null ? (
                  <AuthenticatedClientNavigation onReady={onReady} ref={ref} />
                ) : (
                  <SignedInEmailChangeLink
                    api={authenticationApi}
                    onDone={() => setHandledLink(emailChangeToken)}
                    token={emailChangeToken}
                  />
                )
              }
            </ClientPushNotifications>
          </ClientApiBaseUrlContext.Provider>
        </ClientFetcherContext.Provider>
      </MobileQueryProvider>
    );
  }

  if (emailChangeToken !== null) {
    return (
      <EmailChangeLinkScreen
        api={authenticationApi}
        onDone={() => setHandledLink(emailChangeToken)}
        token={emailChangeToken}
      />
    );
  }

  return (
    <AuthenticationFlow
      api={authenticationApi}
      intent={authenticationIntent}
      notice={signOutNotice}
      onBiometricUnlock={onBiometricUnlock}
      onLogin={onLogin}
      onRecoveryCredential={onRecoveryCredential}
      pendingRegistrationStore={pendingRegistrationStore}
    />
  );
}
