import {
  AuthenticationFlow,
  Heading,
  Screen,
  type AppRole,
  type MobileNavigationProps,
} from "@pilates/mobile-core";
import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

type StaffRole = Exclude<AppRole, "client">;

function NavigationPlaceholder({ title }: { title: string }) {
  return (
    <Screen>
      <Heading accessibilityLabel={title}>{title}</Heading>
    </Screen>
  );
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

const TrainerStack = createNativeStackNavigator({
  screens: { Agenda: TrainerAgendaScreen },
});
const AssistantStack = createNativeStackNavigator({
  screens: { ClientSearch: AssistantClientSearchScreen },
});
const AdministratorStack = createNativeStackNavigator({
  screens: { Payments: AdministratorPaymentsScreen },
});
const NutritionistStack = createNativeStackNavigator({
  screens: { Agenda: NutritionistAgendaScreen },
});

const roleNavigation: Record<
  StaffRole,
  ReturnType<typeof createStaticNavigation>
> = {
  administrator: createStaticNavigation(AdministratorStack),
  assistant: createStaticNavigation(AssistantStack),
  nutritionist: createStaticNavigation(NutritionistStack),
  trainer: createStaticNavigation(TrainerStack),
};

export function StaffNavigation({
  authenticationApi,
  authenticationIntent,
  onBiometricUnlock,
  onLogin,
  onRecoveryCredential,
  role,
}: MobileNavigationProps) {
  if (role !== undefined && role !== "client") {
    const AuthenticatedStaffNavigation = roleNavigation[role];
    return <AuthenticatedStaffNavigation />;
  }

  return (
    <AuthenticationFlow
      allowClientRegistration={false}
      api={authenticationApi}
      intent={
        authenticationIntent?.type === "verify-email"
          ? null
          : authenticationIntent
      }
      onBiometricUnlock={onBiometricUnlock}
      onLogin={onLogin}
      onRecoveryCredential={onRecoveryCredential}
    />
  );
}
