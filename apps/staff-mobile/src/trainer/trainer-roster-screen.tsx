import {
  getTrainerSessionRoster,
  useGetTrainerSessionRoster,
  type TrainerRosterBookingDto,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  fontFamilies,
  formatTimeRange,
  Heading,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  spacing,
  surfaces,
  typography,
  useMountedAt,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { createTrainerApi } from "../trainer-api";
import { requireOk } from "./require-ok";

type AttendanceOutcome = "attended" | "no_show";
type TrainerRosterNavigation = {
  goBack: () => void;
  navigate: (screen: "ReportFault", params: { sessionId: string }) => void;
};

function savedOutcomes(bookings: TrainerRosterBookingDto[]): Record<string, AttendanceOutcome> {
  return Object.fromEntries(
    bookings.flatMap((booking) =>
      booking.attendanceOutcome === undefined || booking.attendanceOutcome === null
        ? []
        : [[booking.bookingId, booking.attendanceOutcome]],
    ),
  );
}

// S03: the attendance list of a Session the Trainer leads.
export function TrainerRosterScreen({ route }: { route: { params: { sessionId: string } } }) {
  const navigation = useNavigation<TrainerRosterNavigation>();
  const fetcher = useStaffFetcher();
  const roster = useGetTrainerSessionRoster(route.params.sessionId, {
    fetcher,
    query: {
      queryFn: ({ signal }) =>
        getTrainerSessionRoster(route.params.sessionId, { signal }, fetcher).then((response) =>
          requireOk(response, "The roster could not be loaded"),
        ),
      refetchOnMount: "always",
    },
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
  if (roster.isError || roster.data === undefined || roster.data.status !== 200)
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
      {/* Follow-up 171: a fault can be found at any time, before or after the class. */}
      <Pressable
        accessibilityLabel="Reportar una falla"
        accessibilityRole="button"
        onPress={() => navigation.navigate("ReportFault", { sessionId: session.sessionId })}
        style={styles.reportFault}
        testID="roster-report-fault"
      >
        <Text style={styles.reportFaultText}>Reportar una falla</Text>
      </Pressable>
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

const styles = StyleSheet.create({
  reportFault: { alignSelf: "flex-start", justifyContent: "center", minHeight: 44 },
  reportFaultText: {
    color: colors.primary,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
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
