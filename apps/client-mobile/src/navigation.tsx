import {
  AuthenticationFlow,
  MobileQueryProvider,
  type MobileNavigationProps,
} from "@pilates/mobile-core";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { BookingsScreen } from "./booking/bookings-screen";
import { BrowseSessionsScreen } from "./booking/browse-sessions-screen";
import { ClassHistoryScreen } from "./booking/class-history-screen";
import { RescheduleScreen } from "./booking/reschedule-screen";
import { SessionDetailScreen } from "./booking/session-detail-screen";
import { ClientFetcherContext } from "./client-fetcher";
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
import { EditProfileScreen } from "./profile/edit-profile-screen";
import { ClientNotificationsScreen } from "./profile/notifications-screen";
import { ProfileScreen } from "./profile/profile-screen";
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

const HomeStack = createNativeStackNavigator({
  screenOptions: { headerShown: false },
  screens: { Home: HomeScreen, ...planScreens },
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
    Referrals: ReferralsScreen,
    Credit: CreditScreen,
    EvaluationAvailability: EvaluationAvailabilityScreen,
    BookEvaluation: BookEvaluationScreen,
    MyEvaluations: MyEvaluationsScreen,
    ...planScreens,
  },
});

const ClientTabs = createBottomTabNavigator({
  screenOptions: { headerShown: false },
  screens: {
    HomeTab: { screen: HomeStack, options: { title: "Inicio" } },
    Booking: { screen: BookingStack, options: { title: "Reservar" } },
    Bookings: { screen: BookingsStack, options: { title: "Mis Reservas" } },
    ProfileTab: { screen: ProfileStack, options: { title: "Perfil" } },
  },
});

const AuthenticatedClientNavigation = createStaticNavigation(ClientTabs);

export function ClientNavigation({
  accountId,
  apiFetcher,
  authenticationApi,
  authenticationIntent,
  onBiometricUnlock,
  onLogin,
  onRecoveryCredential,
  role,
}: MobileNavigationProps) {
  if (role === "client") {
    return (
      <MobileQueryProvider accountId={accountId}>
        <ClientFetcherContext.Provider value={apiFetcher ?? unavailableFetcher}>
          <AuthenticatedClientNavigation />
        </ClientFetcherContext.Provider>
      </MobileQueryProvider>
    );
  }

  return (
    <AuthenticationFlow
      api={authenticationApi}
      intent={authenticationIntent}
      onBiometricUnlock={onBiometricUnlock}
      onLogin={onLogin}
      onRecoveryCredential={onRecoveryCredential}
    />
  );
}
