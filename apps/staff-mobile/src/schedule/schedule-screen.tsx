import {
  getListSessionAvailabilityQueryKey,
  useListSessionAvailability,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  civilDateRange,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  spacing,
  StateScreen,
  surfaces,
  Text,
  upcomingCivilDates,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { bodyScroll } from "../ui/card-pieces";
import { useOwnRoleLabel } from "../profile/staff-labels";
import { useStaffFetcher } from "../staff-fetcher";
import { useStaffRole } from "../staff-role";
import { BranchField } from "../ui/branch-field";
import { useCashBranches } from "../ui/branch-chips";
import { DayStrip } from "../ui/day-strip";
import { PlainRow, PlainRowGroup } from "../ui/plain-rows";
import { RootHeader } from "../ui/root-header";
import { allCancelledTitle, countLabel, dayHeading } from "../ui/session-time";
import { cancelledReason } from "../trainer/agenda-cancellations";
import { splitNextClass } from "../trainer/next-class";
import { ClassDayCards } from "../ui/class-day-cards";
import { scheduleCancelledRows, ScheduleClassRow, ScheduleNextClass } from "./schedule-class-card";
import { TabFooter } from "../ui/tab-footer";

type ScheduleNavigation = {
  navigate: {
    (screen: "CancelClass"): void;
    (screen: "ClientsTab", params: { screen: "ClientSearch" }): void;
  };
};

// «3 clases hoy», or «Martes 3 de noviembre · 3 clases» on another day (FIX-083).
function dayCount(date: string, today: string, count: number, cancelled: number): string {
  if (count === 0 && cancelled > 0) return allCancelledTitle(date, today);
  const classes = countLabel(count, "clase", "clases");
  return date === today ? `${classes} hoy` : `${dayHeading(date)} · ${classes}`;
}

/**
 * The read-only week of classes (HOR boards). The Assistant books from a
 * Client's file, so «Reservar para una clienta» opens Clientas; the
 * Coordinator and the Administrator cancel a class from here instead. Boards
 * H01–H05: the band stays fixed; the Branch and the week share a white card,
 * the day's classes sit in cards under their count, and «Reservar para una
 * clienta» in the white footer above the tabs.
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
  const now = new Date();
  const { next, rest } = splitNextClass(standing, selectedDate === today, now);

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={bodyScroll.content}
        refreshControl={refreshControl}
        style={bodyScroll.scroll}
      >
        {selling ? null : (
          <PlainRowGroup>
            <PlainRow
              label="Cancelar una clase"
              onPress={() => navigation.navigate("CancelClass")}
              testID="schedule-cancel-class"
            />
          </PlainRowGroup>
        )}
        <View style={styles.week}>
          {several ? (
            <View style={styles.branch}>
              <BranchField
                onSelect={branches.select}
                options={branches.options}
                selectedId={branch.id}
                selectedName={branch.name}
              />
            </View>
          ) : null}
          <DayStrip
            dates={dates}
            onSelect={setSelectedDate}
            selected={selectedDate}
            testIDPrefix="schedule-day"
            today={today}
          />
        </View>
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
          <>
            {next === undefined ? null : <ScheduleNextClass now={now} session={next} />}
            <ClassDayCards
              cancelledListTestID="schedule-cancelled-list"
              cancelledRows={scheduleCancelledRows(cancelled)}
              foldTestID="schedule-cancelled-fold"
              key={selectedDate}
              label={dayCount(selectedDate, today, standing.length, cancelled.length)}
              reason={cancelledReason(cancelled)}
              rows={rest.map((session) => (
                <ScheduleClassRow fetcher={fetcher} key={session.id} session={session} />
              ))}
            />
          </>
        )}
        {selling ? null : (
          <View style={styles.noteCard}>
            <Text style={styles.note} variant="secundario">
              Solo lectura. Para reservar, abre la ficha de una clienta.
            </Text>
          </View>
        )}
      </ScrollView>
      {selling ? (
        <TabFooter>
          <PrimaryButton
            label="Reservar para una clienta"
            onPress={() => navigation.navigate("ClientsTab", { screen: "ClientSearch" })}
            testID="schedule-book-for-client"
          />
        </TabFooter>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  branch: { paddingHorizontal: spacing.xs },
  note: { textAlign: "center" },
  // Board H02: the read-only line rides its own white card.
  noteCard: { ...surfaces.card, paddingHorizontal: spacing.mdLg, paddingVertical: spacing.smLg },
  screen: { paddingHorizontal: spacing.xlSm },
  // Boards H01–H02: the week (and the Branch) in one white card.
  week: { ...surfaces.card, gap: spacing.smLg, padding: spacing.md },
});
