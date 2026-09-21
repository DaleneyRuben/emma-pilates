import {
  AuthenticationFlow,
  Heading,
  MobileQueryProvider,
  Screen,
  type MobileNavigationProps,
} from "@pilates/mobile-core";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ClientFetcherContext } from "./client-fetcher";
import { HomeScreen } from "./home/home-screen";
import { PlanDetailScreen } from "./plans/plan-detail-screen";
import { PlansScreen } from "./plans/plans-screen";
import { EditProfileScreen } from "./profile/edit-profile-screen";
import { ProfileScreen } from "./profile/profile-screen";
import { SubscriptionScreen } from "./subscription/subscription-screen";

const unavailableFetcher: typeof globalThis.fetch = async () => {
  throw new Error("The authenticated API fetcher is unavailable");
};

function NavigationPlaceholder({ title }: { title: string }) {
  return (
    <Screen>
      <Heading accessibilityLabel={title}>{title}</Heading>
    </Screen>
  );
}

function ClientBookingScreen() {
  return <NavigationPlaceholder title="Reservar" />;
}

function ClientBookingsScreen() {
  return <NavigationPlaceholder title="Mis reservas" />;
}

// Plan and Subscription screens are reachable from both Home and Perfil.
const planScreens = {
  Plans: PlansScreen,
  PlanDetail: PlanDetailScreen,
  Subscription: SubscriptionScreen,
};

const HomeStack = createNativeStackNavigator({
  screenOptions: { headerShown: false },
  screens: { Home: HomeScreen, ...planScreens },
});

const ProfileStack = createNativeStackNavigator({
  screenOptions: { headerShown: false },
  screens: {
    Profile: ProfileScreen,
    EditProfile: EditProfileScreen,
    ...planScreens,
  },
});

const ClientTabs = createBottomTabNavigator({
  screenOptions: { headerShown: false },
  screens: {
    HomeTab: { screen: HomeStack, options: { title: "Inicio" } },
    Booking: { screen: ClientBookingScreen, options: { title: "Reservar" } },
    Bookings: {
      screen: ClientBookingsScreen,
      options: { title: "Mis Reservas" },
    },
    ProfileTab: { screen: ProfileStack, options: { title: "Perfil" } },
  },
});

const AuthenticatedClientNavigation = createStaticNavigation(ClientTabs);

export function ClientNavigation({
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
      <MobileQueryProvider>
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
