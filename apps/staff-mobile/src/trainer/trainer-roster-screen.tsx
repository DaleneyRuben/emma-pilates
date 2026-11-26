import {
  getTrainerSessionRoster,
  useGetTrainerSessionRoster,
  type TrainerRosterBookingDto,
} from "@pilates/api-contracts";
import {
  BrandToast,
  EmptyState,
  LoadingState,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  Screen,
  spacing,
  Text,
  TextButton,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { bodyScroll, RowCard } from "../ui/card-pieces";
import { TabFooter } from "../ui/tab-footer";
import { useStaffFetcher } from "../staff-fetcher";
import { createTrainerApi } from "../trainer-api";
import { BackBar } from "../ui/back-bar";
import { useHasStarted } from "../ui/use-has-started";
import { useMinuteClock } from "../ui/use-minute-clock";
import { useIsTablet } from "../ui/use-is-tablet";
import { countLabel } from "../ui/session-time";
import { RosterBlock } from "./roster-block";
import { AttendanceRow, ComingRow, countNewClients, type AttendanceOutcome } from "./roster-rows";
import { requireOk } from "./require-ok";

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

/**
 * S03, E6 B + A (board E6C): before the class, who is coming and «Tomar
 * asistencia»; once the class starts, or on that tap, the same screen takes
 * attendance with «Vino» / «No vino». Saving waits for the start (owner,
 * 2026-11-03), which the backend enforces too. Boards I05–I09: the band stays
 * fixed, the list is one white card under its label, and the actions sit in
 * the white footer above the tab bar.
 */
export function TrainerRosterScreen({ route }: { route: { params: { sessionId: string } } }) {
  const navigation = useNavigation<TrainerRosterNavigation>();
  const fetcher = useStaffFetcher();
  const tablet = useIsTablet();
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
  const [taking, setTaking] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);
  // Owner, 2026-11-03: attendance opens when the class starts, with no closing
  // time; a roster opened before the start opens it by itself at the start.
  const started = useHasStarted(
    roster.data?.status === 200 ? roster.data.data.startsAt : undefined,
  );
  const now = useMinuteClock();
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
  const attendance = started || taking;
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
  const reportFault = (
    <TextButton
      label="Reportar una falla de equipo"
      onPress={() => navigation.navigate("ReportFault", { sessionId: session.sessionId })}
      style={styles.reportFault}
      testID="roster-report-fault"
    />
  );

  return (
    <Screen style={styles.screen}>
      <BackBar back="Mi agenda" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[bodyScroll.content, tablet && styles.tablet]}
        style={bodyScroll.scroll}
      >
        <RosterBlock
          booked={session.bookings.length}
          branchName={session.branchName}
          capacity={session.capacity}
          classTypeName={session.classTypeName}
          endsAt={session.endsAt}
          marked={attendance ? marked : undefined}
          newClients={countNewClients(session.bookings)}
          now={now}
          startsAt={session.startsAt}
        />
        {empty ? (
          <EmptyState
            icon="calendar"
            message="No hay reservas para esta clase."
            title="Sin reservas"
          />
        ) : (
          <RowCard
            label={
              attendance
                ? "Asistencia"
                : `Quién viene · ${countLabel(session.bookings.length, "clienta", "clientas")}`
            }
          >
            {session.bookings.map((booking) =>
              attendance ? (
                <AttendanceRow
                  booking={booking}
                  fetcher={fetcher}
                  key={booking.bookingId}
                  onChoose={(outcome) =>
                    setEdits((current) => ({ ...current, [booking.bookingId]: outcome }))
                  }
                  outcome={outcomes[booking.bookingId]}
                />
              ) : (
                <ComingRow booking={booking} fetcher={fetcher} key={booking.bookingId} />
              ),
            )}
          </RowCard>
        )}
        {saveError ? <NoticeRow message="No pudimos guardar la asistencia." /> : null}
      </ScrollView>
      <TabFooter style={tablet && styles.tabletFooter} testID="roster-footer">
        {attendance ? (
          <>
            {missing > 0 && !empty ? (
              <Text style={styles.missing} variant="secundario">
                {`Falta marcar a ${countLabel(missing, "clienta", "clientas")}.`}
              </Text>
            ) : null}
            <PrimaryButton
              disabled={empty || !complete || !started}
              disabledReason={
                started || empty
                  ? undefined
                  : "Podrás guardar la asistencia cuando empiece la clase."
              }
              label="Guardar asistencia"
              onPress={() => void saveAttendance()}
              testID="roster-save"
            />
          </>
        ) : null}
        {!attendance && !empty ? (
          <PrimaryButton
            label="Tomar asistencia"
            onPress={() => setTaking(true)}
            testID="roster-take-attendance"
          />
        ) : null}
        {reportFault}
      </TabFooter>
      {saved ? <BrandToast onClose={() => setSaved(false)} title="Asistencia guardada" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", flex: 1, gap: spacing.lg, justifyContent: "center" },
  missing: { textAlign: "center" },
  // Board I05: the link sits at the footer's start, underlined.
  reportFault: { alignSelf: "flex-start", paddingHorizontal: 0 },
  screen: { paddingHorizontal: spacing.lg },
  // On a tablet the roster keeps a phone's column, so the block never stretches.
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
  tabletFooter: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
