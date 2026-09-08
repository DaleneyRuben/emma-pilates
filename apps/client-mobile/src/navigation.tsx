import {
  AuthenticationFlow,
  Heading,
  Screen,
  type MobileNavigationProps,
} from "@pilates/mobile-core";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStaticNavigation } from "@react-navigation/native";

function NavigationPlaceholder({ title }: { title: string }) {
  return (
    <Screen>
      <Heading accessibilityLabel={title}>{title}</Heading>
    </Screen>
  );
}

function ClientHomeScreen() {
  return <NavigationPlaceholder title="Inicio" />;
}

function ClientBookingScreen() {
  return <NavigationPlaceholder title="Reservar" />;
}

function ClientBookingsScreen() {
  return <NavigationPlaceholder title="Mis reservas" />;
}

function ClientProfileScreen() {
  return <NavigationPlaceholder title="Perfil" />;
}

const ClientTabs = createBottomTabNavigator({
  screens: {
    Home: ClientHomeScreen,
    Booking: ClientBookingScreen,
    Bookings: ClientBookingsScreen,
    Profile: ClientProfileScreen,
  },
});

const AuthenticatedClientNavigation = createStaticNavigation(ClientTabs);

export function ClientNavigation({
  authenticationApi,
  authenticationIntent,
  onBiometricUnlock,
  onLogin,
  onRecoveryCredential,
  role,
}: MobileNavigationProps) {
  if (role === "client") {
    return <AuthenticatedClientNavigation />;
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
