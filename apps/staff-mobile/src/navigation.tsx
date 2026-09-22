import {
  AuthenticationFlow,
  BodyText,
  colors,
  Heading,
  MobileQueryProvider,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  typography,
  type AppRole,
  type MobileNavigationProps,
} from "@pilates/mobile-core";
import {
  useGetTrainerSessionRoster,
  useListTrainerSchedule,
} from "@pilates/api-contracts";
import {
  createStaticNavigation,
  useNavigation,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AccountAvatar } from "./profile/account-avatar";
import { StaffChangePasswordScreen } from "./profile/staff-change-password-screen";
import { StaffNotificationsScreen } from "./profile/staff-notifications-screen";
import { StaffProfileScreen } from "./profile/staff-profile-screen";
import {
  StaffFetcherContext,
  unavailableFetcher,
  useStaffFetcher,
} from "./staff-fetcher";
import { createTrainerApi } from "./trainer-api";

type StaffRole = Exclude<AppRole, "client">;
type AttendanceOutcome = "attended" | "no_show";
type TrainerAgendaNavigation = {
  navigate: (screen: "Roster", params: { sessionId: string }) => void;
};
type TrainerRosterNavigation = { goBack: () => void };

function boliviaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/La_Paz",
    year: "numeric",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((values, part) => {
      if (part.type !== "literal") values[part.type] = part.value;
      return values;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDays(date: string, amount: number): string {
  const result = new Date(`${date}T12:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
}

function formatTimeRange(startsAt: string, endsAt: string): string {
  const formatter = new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/La_Paz",
  });
  return `${formatter.format(new Date(startsAt))}–${formatter.format(new Date(endsAt))}`;
}

// Every role root carries the account avatar: it is the only route to Perfil.
function RootHeader({ label, title }: { label: string; title: string }) {
  return (
    <View style={styles.rootHeader}>
      <Heading accessibilityLabel={label} style={styles.rootTitle}>
        {title}
      </Heading>
      <AccountAvatar />
    </View>
  );
}

function NavigationPlaceholder({ title }: { title: string }) {
  return (
    <Screen>
      <RootHeader label={title} title={title} />
    </Screen>
  );
}

function TrainerAgendaScreen() {
  const navigation = useNavigation<TrainerAgendaNavigation>();
  const fetcher = useStaffFetcher();
  const [selectedDate, setSelectedDate] = useState(boliviaDate);
  const schedule = useListTrainerSchedule(
    { on: selectedDate },
    { fetcher, query: { refetchOnMount: "always" } },
  );
  const dates = useMemo(
    () =>
      [-2, -1, 0, 1, 2, 3, 4].map((offset) => addDays(selectedDate, offset)),
    [selectedDate],
  );

  if (schedule.isPending)
    return (
      <Screen style={styles.centered}>
        <RootHeader label="Mi agenda" title="Hola" />
        <BodyText accessibilityLabel="Cargando agenda">
          Cargando agenda…
        </BodyText>
      </Screen>
    );
  if (schedule.isError)
    return (
      <Screen>
        <RootHeader label="Mi agenda" title="Hola" />
        <QueryFailure
          label="No pudimos cargar tu agenda."
          onRetry={() => void schedule.refetch()}
        />
      </Screen>
    );

  const sessions = schedule.data?.data ?? [];
  return (
    <Screen style={styles.screen}>
      <RootHeader label="Mi agenda" title="Hola" />
      <ScrollView
        horizontal
        contentContainerStyle={styles.datePicker}
        showsHorizontalScrollIndicator={false}
      >
        {dates.map((date) => (
          <Pressable
            accessibilityLabel={date}
            accessibilityRole="button"
            accessibilityState={{ selected: date === selectedDate }}
            key={date}
            onPress={() => setSelectedDate(date)}
            style={[
              styles.dateButton,
              date === selectedDate && styles.dateButtonSelected,
            ]}
          >
            <Text
              style={[
                styles.dateLabel,
                date === selectedDate && styles.dateLabelSelected,
              ]}
            >
              {date.slice(8)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {sessions.length === 0 ? (
        <View style={styles.centered}>
          <BodyText>No tienes clases este día.</BodyText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {sessions.map((session) => (
            <Pressable
              accessibilityLabel={session.classTypeName}
              accessibilityRole="button"
              key={session.sessionId}
              onPress={() =>
                navigation.navigate("Roster", { sessionId: session.sessionId })
              }
              style={styles.card}
            >
              <BodyText style={styles.time}>
                {formatTimeRange(session.startsAt, session.endsAt)}
              </BodyText>
              <Text style={styles.cardTitle}>{session.classTypeName}</Text>
              <BodyText>{session.branchName}</BodyText>
              <BodyText>{`${session.bookedCount} de ${session.capacity} reservados`}</BodyText>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function TrainerRosterScreen({
  route,
}: {
  route: { params: { sessionId: string } };
}) {
  const navigation = useNavigation<TrainerRosterNavigation>();
  const fetcher = useStaffFetcher();
  const roster = useGetTrainerSessionRoster(route.params.sessionId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const [outcomes, setOutcomes] = useState<Record<string, AttendanceOutcome>>(
    {},
  );
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);
  const trainerApi = useMemo(() => createTrainerApi(fetcher), [fetcher]);

  useEffect(() => {
    if (roster.data === undefined) return;
    setOutcomes(
      Object.fromEntries(
        roster.data.data.bookings.flatMap((booking) =>
          booking.attendanceOutcome === undefined
            ? []
            : [
                [
                  booking.bookingId,
                  booking.attendanceOutcome as AttendanceOutcome,
                ],
              ],
        ),
      ),
    );
  }, [roster.data]);

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
  const isPostSession = new Date(session.endsAt).getTime() <= Date.now();
  const complete = session.bookings.every(
    (booking) => outcomes[booking.bookingId] !== undefined,
  );
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
      <Pressable
        accessibilityLabel="Volver"
        accessibilityRole="button"
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.back}>← Volver</Text>
      </Pressable>
      <Heading accessibilityLabel={session.classTypeName}>
        {session.classTypeName}
      </Heading>
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
                  const label =
                    outcome === "attended" ? "Asistió" : "No asistió";
                  const selected = outcomes[booking.bookingId] === outcome;
                  return (
                    <Pressable
                      accessibilityLabel={`${booking.clientName}: ${label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={outcome}
                      onPress={() =>
                        setOutcomes((current) => ({
                          ...current,
                          [booking.bookingId]: outcome,
                        }))
                      }
                      style={[
                        styles.segment,
                        selected && styles.segmentSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          selected && styles.segmentTextSelected,
                        ]}
                      >
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
        <BodyText accessibilityRole="alert">
          No pudimos guardar la asistencia.
        </BodyText>
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

function AssistantClientSearchScreen() {
  return <NavigationPlaceholder title="Buscar cliente" />;
}
function AdministratorPaymentsScreen() {
  return <NavigationPlaceholder title="Pagos pendientes" />;
}
function NutritionistAgendaScreen() {
  return <NavigationPlaceholder title="Mi agenda" />;
}

const accountScreens = {
  Profile: StaffProfileScreen,
  Notifications: StaffNotificationsScreen,
  ChangePassword: StaffChangePasswordScreen,
};

const TrainerStack = createNativeStackNavigator({
  screens: {
    Agenda: TrainerAgendaScreen,
    Roster: TrainerRosterScreen,
    ...accountScreens,
  },
});
const AssistantStack = createNativeStackNavigator({
  screens: { ClientSearch: AssistantClientSearchScreen, ...accountScreens },
});
const AdministratorStack = createNativeStackNavigator({
  screens: { Payments: AdministratorPaymentsScreen, ...accountScreens },
});
const NutritionistStack = createNativeStackNavigator({
  screens: { Agenda: NutritionistAgendaScreen, ...accountScreens },
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
      <MobileQueryProvider>
        <StaffFetcherContext.Provider value={apiFetcher ?? unavailableFetcher}>
          <AuthenticatedStaffNavigation />
        </StaffFetcherContext.Provider>
      </MobileQueryProvider>
    );
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

const styles = StyleSheet.create({
  back: {
    color: colors.primaryDeep,
    fontSize: typography.body,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.titleSecondary,
    fontWeight: "500",
  },
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
  dateButton: {
    alignItems: "center",
    borderRadius: radii.pill,
    minWidth: 44,
    padding: spacing.sm,
  },
  dateButtonSelected: { backgroundColor: colors.primary },
  dateLabel: { color: colors.textSecondary, fontSize: typography.body },
  dateLabelSelected: { color: colors.white },
  datePicker: { gap: spacing.sm, paddingVertical: spacing.lg },
  list: { gap: spacing.md, paddingBottom: spacing.lg },
  rootHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.smLg,
    justifyContent: "space-between",
  },
  rootTitle: { flex: 1 },
  rosterRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
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
  time: { color: colors.primaryDeep, fontWeight: "600" },
});
