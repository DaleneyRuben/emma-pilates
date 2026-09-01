import { createStaticNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { AppRole } from "./auth/session-manager";
import { Heading } from "./ui/heading";
import { Screen } from "./ui/screen";

type RootRoute =
  | "Unauthenticated"
  | "Client"
  | "Trainer"
  | "Assistant"
  | "Administrator"
  | "Nutritionist";

function NavigationPlaceholder({ title }: { title: string }) {
  return (
    <Screen>
      <Heading accessibilityLabel={title}>{title}</Heading>
    </Screen>
  );
}

function SignInScreen() {
  return <NavigationPlaceholder title="Iniciar sesión" />;
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

function TrainerAgendaScreen() {
  return <NavigationPlaceholder title="Mi agenda" />;
}

function AssistantClientSearchScreen() {
  return <NavigationPlaceholder title="Buscar cliente" />;
}

function AdministratorPaymentsScreen() {
  return <NavigationPlaceholder title="Pagos pendientes" />;
}

function NutritionistAgendaScreen() {
  return <NavigationPlaceholder title="Mi agenda" />;
}

export const unauthenticatedStackOptions = { headerShown: false };

const UnauthenticatedStack = createNativeStackNavigator({
  screenOptions: unauthenticatedStackOptions,
  screens: {
    SignIn: SignInScreen,
  },
});

const ClientTabs = createBottomTabNavigator({
  screens: {
    Home: ClientHomeScreen,
    Booking: ClientBookingScreen,
    Bookings: ClientBookingsScreen,
    Profile: ClientProfileScreen,
  },
});

const TrainerStack = createNativeStackNavigator({
  screens: {
    Agenda: TrainerAgendaScreen,
  },
});

const AssistantStack = createNativeStackNavigator({
  screens: {
    ClientSearch: AssistantClientSearchScreen,
  },
});

const AdministratorStack = createNativeStackNavigator({
  screens: {
    Payments: AdministratorPaymentsScreen,
  },
});

const NutritionistStack = createNativeStackNavigator({
  screens: {
    Agenda: NutritionistAgendaScreen,
  },
});

const UnauthenticatedNavigation = createStaticNavigation(UnauthenticatedStack);
const ClientNavigation = createStaticNavigation(ClientTabs);
const TrainerNavigation = createStaticNavigation(TrainerStack);
const AssistantNavigation = createStaticNavigation(AssistantStack);
const AdministratorNavigation = createStaticNavigation(AdministratorStack);
const NutritionistNavigation = createStaticNavigation(NutritionistStack);

const roleRoutes: Record<AppRole, RootRoute> = {
  client: "Client",
  trainer: "Trainer",
  assistant: "Assistant",
  administrator: "Administrator",
  nutritionist: "Nutritionist",
};

export function getRootRouteForRole(role?: AppRole): RootRoute {
  if (role === undefined) {
    return "Unauthenticated";
  }

  return roleRoutes[role];
}

export function MobileNavigation({ role }: { role?: AppRole }) {
  switch (role) {
    case "client":
      return <ClientNavigation />;
    case "trainer":
      return <TrainerNavigation />;
    case "assistant":
      return <AssistantNavigation />;
    case "administrator":
      return <AdministratorNavigation />;
    case "nutritionist":
      return <NutritionistNavigation />;
    default:
      return <UnauthenticatedNavigation />;
  }
}
