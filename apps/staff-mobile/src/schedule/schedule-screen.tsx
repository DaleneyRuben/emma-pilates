import {
  getListSessionAvailabilityQueryKey,
  useListSessionAvailability,
  type SessionAvailabilityDto,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  civilDateRange,
  colors,
  fontFamilies,
  IconRow,
  IconRowGroup,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  StaffFace,
  StateScreen,
  typography,
  upcomingCivilDates,
  usePullToRefresh,
  formatTimeRange,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { roleLabel } from "../profile/staff-labels";
import { useStaffFetcher } from "../staff-fetcher";
import { useStaffRole } from "../staff-role";
import { agendaHeading, causeLabel } from "../trainer/agenda-cancellations";
import { BranchField } from "../ui/branch-field";
import { useCashBranches } from "../ui/branch-chips";
import { CancelledSessionRow } from "../ui/cancelled-session-row";
import { DayStrip } from "../ui/day-strip";
import { RootHeader } from "../ui/root-header";
import { SessionRow } from "../ui/session-row";
import { countLabel, dayHeading, minutesLabel, startTime } from "../ui/session-time";

type ScheduleNavigation = {
  navigate: {
    (screen: "CancelClass"): void;
    (screen: "ClientsTab", params: { screen: "ClientSearch" }): void;
  };
};

function seats(session: SessionAvailabilityDto): string {
  return session.availableSeats === 0
    ? "Completa"
    : countLabel(session.availableSeats, "cupo", "cupos");
}

function booked(session: SessionAvailabilityDto): string {
  return session.bookedCount === 0
    ? `${session.trainerName} · sin reservas`
    : `${session.trainerName} · ${session.bookedCount} de ${session.capacity} reservados`;
}

/**
 * The read-only week of classes (HOR boards). The Assistant books from a
 * Client's file, so «Reservar para una clienta» opens Clientes; the
 * Coordinator and the Administrator cancel a class from here instead.
 */
export function ScheduleScreen() {
  const navigation = useNavigation<ScheduleNavigation>();
  const role = useStaffRole();
  const fetcher = useStaffFetcher();
  const selling = role === "assistant";
  const today = boliviaCivilDate(new Date());
  const dates = useMemo(() => upcomingCivilDates(today, 7), [today]);
  const [selectedDate, setSelectedDate] = useState(today);
  const branches = useCashBranches();
  const branch = branches.branch;
  const { from, until } = civilDateRange(selectedDate);
  const sessions = useListSessionAvailability(
    // FIX-052 (n.º 48): cancelled classes keep their place, as on the web.
    { branchId: branch?.id ?? "", from, until, limit: 100, includeCancelled: true },
    { fetcher, query: { enabled: branch !== null, refetchOnMount: "always" } },
  );
  const queryKeys = [getListSessionAvailabilityQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const several = branches.options.length > 1;
  const eyebrow =
    branch === null || several ? roleLabel(role) : `${roleLabel(role)} · ${branch.name}`;

  const header = <RootHeader eyebrow={eyebrow} title="Horario" />;
  if (branches.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando horario" />
      </Screen>
    );
  }
  if (branches.isError || branch === null) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar las sucursales." onRetry={branches.refetch} />
      </Screen>
    );
  }
  const list = sessions.data?.status === 200 ? sessions.data.data : [];

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        {header}
        {selling ? null : (
          <IconRowGroup>
            <IconRow
              chevron
              icon="calendar"
              label="Cancelar una clase"
              onPress={() => navigation.navigate("CancelClass")}
              testID="schedule-cancel-class"
            />
          </IconRowGroup>
        )}
        {several ? (
          <BranchField
            onSelect={branches.select}
            options={branches.options}
            selectedId={branch.id}
            selectedName={branch.name}
          />
        ) : null}
        <DayStrip
          dates={dates}
          onSelect={setSelectedDate}
          selected={selectedDate}
          testIDPrefix="schedule-day"
          today={today}
        />
        {sessions.isPending ? (
          <LoadingState label="Cargando clases" />
        ) : sessions.isError || sessions.data.status !== 200 ? (
          <QueryFailure
            label="No pudimos cargar las clases."
            onRetry={() => void sessions.refetch()}
          />
        ) : list.length === 0 ? (
          <StateScreen
            icon="calendar"
            layout="inList"
            note="Elige otro día de la semana."
            title="Este día no hay clases"
          />
        ) : (
          <View>
            <SectionTitle>{agendaHeading(dayHeading(selectedDate), list)}</SectionTitle>
            <View style={styles.list}>
              {list.map((session) => {
                const cancellation = session.cancellation ?? null;
                if (cancellation !== null) {
                  const cause = causeLabel(cancellation.cause);
                  return (
                    <CancelledSessionRow
                      accessibilityLabel={`${session.classTypeName}, ${formatTimeRange(session.startsAt, session.endsAt)}, ${cause}`}
                      cause={cause}
                      duration={minutesLabel(session.startsAt, session.endsAt)}
                      key={session.id}
                      testID={`schedule-cancelled-${session.id}`}
                      time={startTime(session.startsAt, session.endsAt)}
                      title={session.classTypeName}
                    />
                  );
                }
                return (
                  <SessionRow
                    key={session.id}
                    pill={selling ? seats(session) : undefined}
                    pillTone={session.availableSeats === 0 ? "neutral" : "tint"}
                    subtitle={booked(session)}
                    subtitleLead={
                      <StaffFace
                        fetcher={fetcher}
                        name={session.trainerName}
                        photo={session.trainerPhoto}
                        size={20}
                      />
                    }
                    testID={`schedule-session-${session.id}`}
                    time={startTime(session.startsAt, session.endsAt)}
                    title={session.classTypeName}
                  />
                );
              })}
            </View>
          </View>
        )}
        {selling ? null : (
          <Text style={styles.note}>
            Solo lectura. Para reservar, abre la ficha de una clienta.
          </Text>
        )}
      </ScrollView>
      {selling ? (
        <View style={styles.footer}>
          <PrimaryButton
            label="Reservar para una clienta"
            onPress={() => navigation.navigate("ClientsTab", { screen: "ClientSearch" })}
            testID="schedule-book-for-client"
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  footer: { paddingBottom: spacing.lg, paddingTop: spacing.sm },
  list: { gap: spacing.md },
  note: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    textAlign: "center",
  },
  screen: { paddingHorizontal: spacing.xlSm },
});
