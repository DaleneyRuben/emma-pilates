import {
  getTrainerSessionRoster,
  useGetTrainerSessionRoster,
  type TrainerRosterBookingDto,
} from "@pilates/api-contracts";
import {
  BrandToast,
  ClientFace,
  colors,
  EmptyState,
  fontFamilies,
  formatSessionDate,
  formatTimeRange,
  IconRow,
  IconRowGroup,
  LoadingState,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { createTrainerApi } from "../trainer-api";
import { BackBar, backBarScroll } from "../ui/back-bar";
import { useHasStarted } from "../ui/use-has-started";
import { PersonRow } from "../ui/person-row";
import { SectionHeader } from "../ui/section-header";
import { countLabel } from "../ui/session-time";
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
  // Owner, 2026-11-03: attendance opens when the class starts, with no closing
  // time; a roster opened before the start opens it by itself at the start.
  const attendanceOpen = useHasStarted(
    roster.data?.status === 200 ? roster.data.data.startsAt : undefined,
  );
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
  const empty = session.bookings.length === 0;
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

  const marked = session.bookings.filter(
    (booking) => outcomes[booking.bookingId] !== undefined,
  ).length;
  const missing = session.bookings.length - marked;

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, backBarScroll.content]}
        style={backBarScroll.scroll}
      >
        <BackBar
          back="Mi agenda"
          onBack={() => navigation.goBack()}
          subtitle={`${session.branchName} · ${formatSessionDate(session.startsAt)} · ${formatTimeRange(session.startsAt, session.endsAt)}`}
          title={session.classTypeName}
        />
        {/* Follow-up 171: a fault can be found at any time, before or after the class. */}
        <IconRowGroup>
          <IconRow
            chevron
            icon="alert"
            label="Reportar una falla"
            onPress={() => navigation.navigate("ReportFault", { sessionId: session.sessionId })}
            testID="roster-report-fault"
          />
        </IconRowGroup>
        {empty ? (
          <EmptyState
            icon="calendar"
            message="No hay reservas para esta sesión."
            title="Sin reservas"
            variant="plain"
          />
        ) : (
          <View>
            <SectionHeader
              meta={
                attendanceOpen
                  ? `${marked} de ${session.bookings.length} marcadas`
                  : countLabel(session.bookings.length, "reserva", "reservas")
              }
              title={attendanceOpen ? "Asistencia" : "Reservas"}
            />
            <IconRowGroup>
              {session.bookings.map((booking) =>
                attendanceOpen ? (
                  <View key={booking.bookingId} style={styles.attendanceRow}>
                    <Text style={styles.clientName}>{booking.clientName}</Text>
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
                            setEdits((current) => ({ ...current, [booking.bookingId]: outcome }))
                          }
                          style={[
                            styles.choice,
                            selected && (outcome === "attended" ? styles.attended : styles.noShow),
                          ]}
                          testID={`roster-${outcome}-${booking.bookingId}`}
                        >
                          <Text
                            style={[
                              styles.choiceLabel,
                              selected &&
                                (outcome === "attended"
                                  ? styles.attendedLabel
                                  : styles.noShowLabel),
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <PersonRow
                    face={
                      <ClientFace
                        fetcher={fetcher}
                        name={booking.clientName}
                        photo={booking.clientPhoto}
                        size={36}
                      />
                    }
                    key={booking.bookingId}
                    name={booking.clientName}
                  />
                ),
              )}
            </IconRowGroup>
          </View>
        )}
        {!attendanceOpen ? (
          <IconRowGroup>
            <IconRow icon="clock" label="Podrás marcar asistencia cuando empiece la clase." />
          </IconRowGroup>
        ) : null}
        {saveError ? <NoticeRow message="No pudimos guardar la asistencia." /> : null}
      </ScrollView>
      {attendanceOpen ? (
        <View style={styles.footer}>
          {missing > 0 && !empty ? (
            <Text style={styles.missing}>
              {`Falta marcar a ${countLabel(missing, "clienta", "clientas")}.`}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={empty || !complete}
            label="Guardar asistencia"
            onPress={() => void saveAttendance()}
            testID="roster-save"
          />
        </View>
      ) : null}
      {saved ? <BrandToast onClose={() => setSaved(false)} title="Asistencia guardada" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  attended: { backgroundColor: colors.primaryTint },
  attendedLabel: { color: colors.primaryOnTint, fontFamily: fontFamilies.bodyStrong },
  attendanceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 60,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  centered: { alignItems: "center", flex: 1, gap: spacing.lg, justifyContent: "center" },
  choice: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  choiceLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 13 },
  clientName: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: 15 },
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  footer: { gap: spacing.sm, paddingBottom: spacing.lg, paddingTop: spacing.md },
  missing: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    textAlign: "center",
  },
  noShow: { backgroundColor: colors.errorSurface },
  noShowLabel: { color: colors.error, fontFamily: fontFamilies.bodyStrong },
  screen: { paddingHorizontal: spacing.xlSm },
});
