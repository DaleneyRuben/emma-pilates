import {
  getListSessionAvailabilityQueryKey,
  useListSessionAvailability,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  civilDateRange,
  ClassList,
  colors,
  fontFamilies,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  StateScreen,
  upcomingCivilDates,
  usePullToRefresh,
  typography,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useOwnRoleLabel } from "../profile/staff-labels";
import { useStaffFetcher } from "../staff-fetcher";
import { useStaffRole } from "../staff-role";
import { BranchField } from "../ui/branch-field";
import { useCashBranches } from "../ui/branch-chips";
import { DayStrip } from "../ui/day-strip";
import { PlainRow, PlainRowGroup } from "../ui/plain-rows";
import { RootHeader } from "../ui/root-header";
import { countLabel, dayHeading } from "../ui/session-time";
import { ScheduleCancelledFold, ScheduleClassRow } from "./schedule-class-card";

type ScheduleNavigation = {
  navigate: {
    (screen: "CancelClass"): void;
    (screen: "ClientsTab", params: { screen: "ClientSearch" }): void;
  };
};

// «3 clases hoy», or «Martes 3 de noviembre · 3 clases» on another day (FIX-083).
function dayCount(date: string, today: string, count: number, cancelled: number): string {
  if (count === 0 && cancelled > 0) {
    return date === today
      ? "Hoy todas las clases están canceladas"
      : `${dayHeading(date)} · todas canceladas`;
  }
  const classes = countLabel(count, "clase", "clases");
  return date === today ? `${classes} hoy` : `${dayHeading(date)} · ${classes}`;
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
  const roleLabel = useOwnRoleLabel();
  const eyebrow = branch === null || several ? roleLabel : `${roleLabel} · ${branch.name}`;

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
  const standing = list.filter((session) => (session.cancellation ?? null) === null);
  const cancelled = list.filter((session) => (session.cancellation ?? null) !== null);

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        {header}
        {selling ? null : (
          <PlainRowGroup>
            <PlainRow
              label="Cancelar una clase"
              onPress={() => navigation.navigate("CancelClass")}
              testID="schedule-cancel-class"
            />
          </PlainRowGroup>
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
          <View style={styles.list}>
            <SectionTitle>
              {dayCount(selectedDate, today, standing.length, cancelled.length)}
            </SectionTitle>
            {standing.length === 0 ? null : (
              <ClassList>
                {standing.map((session) => (
                  <ScheduleClassRow fetcher={fetcher} key={session.id} session={session} />
                ))}
              </ClassList>
            )}
            <ScheduleCancelledFold key={selectedDate} sessions={cancelled} />
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
