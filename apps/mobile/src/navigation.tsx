import { createStaticNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Heading } from "./ui/heading";
import { Screen } from "./ui/screen";

type AppRole =
  "client" | "trainer" | "assistant" | "administrator" | "nutritionist";

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

const UnauthenticatedStack = createNativeStackNavigator({
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

const RootStack = createNativeStackNavigator({
  initialRouteName: "Unauthenticated",
  screens: {
    Unauthenticated: {
      screen: UnauthenticatedStack,
      options: { headerShown: false },
    },
    Client: {
      screen: ClientTabs,
      options: { headerShown: false },
    },
    Trainer: {
      screen: TrainerStack,
      options: { headerShown: false },
    },
    Assistant: {
      screen: AssistantStack,
      options: { headerShown: false },
    },
    Administrator: {
      screen: AdministratorStack,
      options: { headerShown: false },
    },
    Nutritionist: {
      screen: NutritionistStack,
      options: { headerShown: false },
    },
  },
});

const StaticNavigation = createStaticNavigation(RootStack);

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

export function MobileNavigation() {
  return <StaticNavigation />;
}
