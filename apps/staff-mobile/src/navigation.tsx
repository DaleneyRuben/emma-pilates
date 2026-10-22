import {
  AuthenticationFlow,
  BackLink,
  BodyText,
  colors,
  formatTimeRange,
  Heading,
  LoadingState,
  type MobileNavigationProps,
  MobileQueryProvider,
  PrimaryButton,
  QueryFailure,
  recoveryScreenLayout,
  Screen,
  spacing,
  surfaces,
  typography,
  useMountedAt,
} from "@pilates/mobile-core";
import { useGetTrainerSessionRoster, type TrainerRosterBookingDto } from "@pilates/api-contracts";
import { createStaticNavigation, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { StaffNotificationsScreen } from "./profile/staff-notifications-screen";
import { StaffProfileScreen } from "./profile/staff-profile-screen";
import { TrainerAgendaScreen } from "./trainer/trainer-agenda-screen";
import { StaffFetcherContext, unavailableFetcher, useStaffFetcher } from "./staff-fetcher";
import { createTrainerApi } from "./trainer-api";

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
        <LoadingState label="Cargando lista" />
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
                      testID={`roster-${outcome}-${booking.bookingId}`}
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
          testID="roster-save"
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
    ViewAs: ViewAsScreen,
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
  pushedDown: { flex: 1 },
  underBanner: { flex: 1 },
});
