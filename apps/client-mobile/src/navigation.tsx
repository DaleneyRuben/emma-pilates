import {
  AuthenticationFlow,
  colors,
  EmailChangeLinkScreen,
  MobileQueryProvider,
  type MobileNavigationProps,
  typography,
} from "@pilates/mobile-core";
import { getGetCurrentClientProfileQueryKey } from "@pilates/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { BookingsScreen } from "./booking/bookings-screen";
import { BrowseSessionsScreen } from "./booking/browse-sessions-screen";
import { ClassHistoryScreen } from "./booking/class-history-screen";
import { RescheduleScreen } from "./booking/reschedule-screen";
import { SessionDetailScreen } from "./booking/session-detail-screen";
import { ClientApiBaseUrlContext, ClientFetcherContext } from "./client-fetcher";
import { ClientTabIcon, type ClientTabIconName } from "./client-tab-icon";
import { BookEvaluationScreen } from "./evaluations/book-evaluation-screen";
import { EvaluationAvailabilityScreen } from "./evaluations/evaluation-availability-screen";
import { MyEvaluationsScreen } from "./evaluations/my-evaluations-screen";
import { HomeScreen } from "./home/home-screen";
import { CreditScreen } from "./payments/credit-screen";
import { PaymentScreen } from "./payments/payment-screen";
import { ReferralsScreen } from "./payments/referrals-screen";
import { PaymentStatusScreen } from "./payments/payment-status-screen";
import { PlanDetailScreen } from "./plans/plan-detail-screen";
import { PlansScreen } from "./plans/plans-screen";
import { ClientChangePasswordScreen } from "./profile/change-password-screen";
import { CloseAccountScreen } from "./profile/close-account-screen";
import { EditProfileScreen } from "./profile/edit-profile-screen";
import { ClientNotificationsScreen } from "./profile/notifications-screen";
import { ProfileScreen } from "./profile/profile-screen";
import { ProfileTabButton } from "./profile/profile-tab-button";
import { SubscriptionScreen } from "./subscription/subscription-screen";

const unavailableFetcher: typeof globalThis.fetch = async () => {
  throw new Error("The authenticated API fetcher is unavailable");
};

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
  Credit: CreditScreen,
};

const HomeStack = createNativeStackNavigator({
  screenOptions: { headerShown: false },
  screens: { Home: HomeScreen, ...planScreens, ...shortcutScreens },
});

const BookingsStack = createNativeStackNavigator({
  screenOptions: { headerShown: false },
  screens: {
    MyBookings: BookingsScreen,
    Reschedule: RescheduleScreen,
    History: ClassHistoryScreen,
  },
});

const BookingStack = createNativeStackNavigator({
  screenOptions: { headerShown: false },
  screens: {
    Browse: BrowseSessionsScreen,
    SessionDetail: SessionDetailScreen,
    ...planScreens,
  },
});

const ProfileStack = createNativeStackNavigator({
  screenOptions: { headerShown: false },
  screens: {
    Profile: ProfileScreen,
    EditProfile: EditProfileScreen,
    Notifications: ClientNotificationsScreen,
    ChangePassword: ClientChangePasswordScreen,
    CloseAccount: CloseAccountScreen,
    ...shortcutScreens,
    ...planScreens,
  },
});

const tabOptions = (title: string, icon: ClientTabIconName) => ({
  tabBarIcon: ({ color }: { color: string }) => (
    <ClientTabIcon color={color} name={icon} />
  ),
  title,
});

const ClientTabs = createBottomTabNavigator({
  // Labels stay under the icons on a tablet too, so the Perfil count sits on
  // its icon (follow-up 73) instead of over the label.
  screenOptions: {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSubtle,
    tabBarLabelPosition: "below-icon",
    tabBarLabelStyle: { fontSize: typography.tabLabel },
    tabBarStyle: {
      backgroundColor: colors.white,
      borderTopColor: colors.borderStrong,
    },
  },
  screens: {
    HomeTab: { screen: HomeStack, options: tabOptions("Inicio", "home") },
    Booking: { screen: BookingStack, options: tabOptions("Reservar", "booking") },
    Bookings: {
      screen: BookingsStack,
      options: tabOptions("Mis Reservas", "bookings"),
    },
    ProfileTab: {
      screen: ProfileStack,
      options: {
        ...tabOptions("Perfil", "profile"),
        tabBarButton: (props) => <ProfileTabButton {...props} />,
      },
    },
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
  onBiometricUnlock,
  onLogin,
  onRecoveryCredential,
  pendingRegistrationStore,
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
            {emailChangeToken === null ? (
              <AuthenticatedClientNavigation />
            ) : (
              <SignedInEmailChangeLink
                api={authenticationApi}
                onDone={() => setHandledLink(emailChangeToken)}
                token={emailChangeToken}
              />
            )}
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
