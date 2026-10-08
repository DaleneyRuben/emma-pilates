import {
  AuthenticationFlow,
  BackLink,
  BodyText,
  colors,
  formatTimeRange,
  Heading,
  MobileQueryProvider,
  PrimaryButton,
  QueryFailure,
  recoveryScreenLayout,
  Screen,
  spacing,
  surfaces,
  type AppRole,
  type MobileNavigationProps,
  typography,
  useMountedAt,
} from "@pilates/mobile-core";
import { useGetTrainerSessionRoster, type TrainerRosterBookingDto } from "@pilates/api-contracts";
import { createStaticNavigation, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CancelClassScreen } from "./administrator/cancel-class-screen";
import { CancelSessionScreen } from "./administrator/cancel-session-screen";
import { PendingPaymentsScreen } from "./administrator/pending-payments-screen";
import { ReviewPaymentScreen } from "./administrator/review-payment-screen";
import { AssistantWorkspaceProvider } from "./assistant/assistant-workspace";
import { AssistantRescheduleScreen } from "./assistant/assistant-reschedule-screen";
import { AssistantSessionDetailScreen } from "./assistant/assistant-session-detail-screen";
import { BrowseSessionsScreen } from "./assistant/browse-sessions-screen";
import { ClientBookingsScreen } from "./assistant/client-bookings-screen";
import { ClientHistoryScreen } from "./assistant/client-history-screen";
import { ClientOverviewScreen } from "./assistant/client-overview-screen";
import { ClientSearchScreen } from "./assistant/client-search-screen";
import { ConfirmCashPaymentScreen } from "./assistant/confirm-cash-payment-screen";
import { NewClientScreen } from "./assistant/new-client-screen";
import { SelectPlanScreen } from "./assistant/select-plan-screen";
import { AvailabilityBlockFormScreen } from "./nutritionist/availability-block-form-screen";
import { AvailabilityScreen } from "./nutritionist/availability-screen";
import { NutritionistAgendaScreen } from "./nutritionist/nutritionist-agenda-screen";
import { StaffChangePasswordScreen } from "./profile/staff-change-password-screen";
import { StaffNotificationsScreen } from "./profile/staff-notifications-screen";
import { StaffProfileScreen } from "./profile/staff-profile-screen";
import { TrainerAgendaScreen } from "./trainer/trainer-agenda-screen";
import { StaffFetcherContext, unavailableFetcher, useStaffFetcher } from "./staff-fetcher";
import { createTrainerApi } from "./trainer-api";

type StaffRole = Exclude<AppRole, "client">;
type AttendanceOutcome = "attended" | "no_show";
type TrainerRosterNavigation = { goBack: () => void };

function savedOutcomes(bookings: TrainerRosterBookingDto[]): Record<string, AttendanceOutcome> {
  return Object.fromEntries(
    bookings.flatMap((booking) =>
      booking.attendanceOutcome === undefined || booking.attendanceOutcome === null
        ? []
        : [[booking.bookingId, booking.attendanceOutcome]],
    ),
  );
}

function TrainerRosterScreen({ route }: { route: { params: { sessionId: string } } }) {
  const navigation = useNavigation<TrainerRosterNavigation>();
  const fetcher = useStaffFetcher();
  const roster = useGetTrainerSessionRoster(route.params.sessionId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  // The Trainer's taps sit over the saved outcomes, so a refetch never undoes a tap.
  const [edits, setEdits] = useState<Record<string, AttendanceOutcome>>({});
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);
  const openedAt = useMountedAt();
  const trainerApi = useMemo(() => createTrainerApi(fetcher), [fetcher]);

  if (roster.isPending)
    return (
      <Screen style={styles.centered}>
        <BodyText accessibilityLabel="Cargando lista">Cargando lista…</BodyText>
      </Screen>
    );
  if (roster.isError || roster.data === undefined)
    return (
      <Screen>
        <QueryFailure
          label="No pudimos cargar la lista de asistencia."
          onRetry={() => void roster.refetch()}
        />
      </Screen>
    );

  const session = roster.data.data;
  const outcomes = { ...savedOutcomes(session.bookings), ...edits };
  const isPostSession = new Date(session.endsAt).getTime() <= openedAt;
  const complete = session.bookings.every((booking) => outcomes[booking.bookingId] !== undefined);
  const saveAttendance = async () => {
    setSaveError(false);
    try {
      await trainerApi.saveAttendance(
        session.sessionId,
        session.bookings.map((booking) => ({
          bookingId: booking.bookingId,
          outcome: outcomes[booking.bookingId],
        })),
      );
      setSaved(true);
    } catch {
      setSaveError(true);
    }
  };

  return (
    <Screen style={styles.screen}>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel={session.classTypeName}>{session.classTypeName}</Heading>
      <BodyText>{`${session.branchName} · ${formatTimeRange(session.startsAt, session.endsAt)}`}</BodyText>
      <ScrollView contentContainerStyle={styles.list}>
        {session.bookings.length === 0 ? (
          <BodyText>No hay reservas para esta sesión.</BodyText>
        ) : null}
        {session.bookings.map((booking) => (
          <View key={booking.bookingId} style={styles.rosterRow}>
            <Text style={styles.clientName}>{booking.clientName}</Text>
            {isPostSession ? (
              <View style={styles.segmented}>
                {(["attended", "no_show"] as const).map((outcome) => {
                  const label = outcome === "attended" ? "Asistió" : "No asistió";
                  const selected = outcomes[booking.bookingId] === outcome;
                  return (
                    <Pressable
                      accessibilityLabel={`${booking.clientName}: ${label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={outcome}
                      onPress={() =>
                        setEdits((current) => ({
                          ...current,
                          [booking.bookingId]: outcome,
                        }))
                      }
                      style={[styles.segment, selected && styles.segmentSelected]}
                    >
                      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
      {!isPostSession ? (
        <BodyText>Podrás marcar asistencia cuando termine la clase.</BodyText>
      ) : null}
      {saveError ? (
        <BodyText accessibilityRole="alert">No pudimos guardar la asistencia.</BodyText>
      ) : null}
      {saved ? <BodyText>Asistencia guardada.</BodyText> : null}
      {isPostSession ? (
        <PrimaryButton
          disabled={!complete}
          label="Guardar asistencia"
          onPress={() => void saveAttendance()}
        />
      ) : null}
    </Screen>
  );
}

const accountScreens = {
  Profile: StaffProfileScreen,
  Notifications: StaffNotificationsScreen,
  ChangePassword: StaffChangePasswordScreen,
};

const TrainerStack = createNativeStackNavigator({
  screenLayout: recoveryScreenLayout,
  screenOptions: { headerShown: false },
  screens: {
    Agenda: TrainerAgendaScreen,
    Roster: TrainerRosterScreen,
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
  nutritionist: createStaticNavigation(NutritionistStack),
  trainer: createStaticNavigation(TrainerStack),
};

export function StaffNavigation({
  accountId,
  apiFetcher,
  authenticationApi,
  authenticationIntent,
  onBiometricUnlock,
  onLogin,
  onRecoveryCredential,
  role,
}: MobileNavigationProps) {
  if (role !== undefined && role !== "client") {
    const AuthenticatedStaffNavigation = roleNavigation[role];
    return (
      <MobileQueryProvider accountId={accountId}>
        <StaffFetcherContext.Provider value={apiFetcher ?? unavailableFetcher}>
          <AssistantWorkspaceProvider>
            <AuthenticatedStaffNavigation />
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
  centered: {
    alignItems: "center",
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
  },
  clientName: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
  list: { gap: spacing.md, paddingBottom: spacing.lg },
  rosterRow: {
    ...surfaces.flatCard,
    gap: spacing.md,
    padding: spacing.lg,
  },
  screen: { gap: spacing.md },
  segment: {
    borderColor: colors.borderStrong,
    borderWidth: 1,
    flex: 1,
    padding: spacing.sm,
  },
  segmentSelected: { backgroundColor: colors.primary },
  segmentText: {
    color: colors.textSecondary,
    fontSize: typography.note,
    textAlign: "center",
  },
  segmentTextSelected: { color: colors.white },
  segmented: { flexDirection: "row" },
});
