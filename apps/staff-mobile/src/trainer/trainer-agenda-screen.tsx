import {
  getListTrainerScheduleQueryKey,
  useGetCurrentStaffMemberProfile,
  useListTrainerSchedule,
  staffRoleLabel,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  colors,
  LoadingState,
  OutlinedButton,
  QueryFailure,
  radii,
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
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { bodyScroll, CardLabel } from "../ui/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { DayStrip } from "../ui/day-strip";
import { RootHeader } from "../ui/root-header";
import { dayHeading } from "../ui/session-time";
import { useIsTablet } from "../ui/use-is-tablet";
import { agendaHeading } from "./agenda-cancellations";
import { AgendaDay } from "./agenda-day";
import { agendaDayQuery, useWeekClassCounts } from "./agenda-schedule-query";

type TrainerAgendaNavigation = {
  navigate: (screen: "Roster", params: { sessionId: string }) => void;
};

/**
 * S02 Mi agenda (v2): it opens on today and shows no past day, since
 * attendance is never corrected (owner, 2026-11-02); «Hoy» comes back to it.
 * E1 B «La semana de un vistazo»: the strip counts each day's classes. Boards
 * I01–I04: the band stays fixed; the week, the hero and the day's cards scroll.
 */
export function TrainerAgendaScreen() {
  const navigation = useNavigation<TrainerAgendaNavigation>();
  const fetcher = useStaffFetcher();
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const today = boliviaCivilDate(new Date());
  const dates = useMemo(() => upcomingCivilDates(today, 7), [today]);
  const [selectedDate, setSelectedDate] = useState(today);
  // FIX-042: the day's cancelled classes come too, shown muted in place.
  const params = { on: selectedDate, includeCancelled: true };
  const schedule = useListTrainerSchedule(params, {
    fetcher,
    query: { queryFn: agendaDayQuery(selectedDate, fetcher).queryFn, refetchOnMount: "always" },
  });
  const counts = useWeekClassCounts(dates, fetcher);
  const tablet = useIsTablet();
  const queryKeys = [getListTrainerScheduleQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const firstName = profile.data?.status === 200 ? profile.data.data.name.split(" ")[0] : undefined;
  const gender = profile.data?.status === 200 ? profile.data.data.gender : undefined;
  const isToday = selectedDate === today;
  const header = (
    <RootHeader
      bell
      eyebrow={`${staffRoleLabel("trainer", gender)} · ${dayHeading(today)}`}
      label="Mi agenda"
      title={firstName === undefined ? "Hola" : `Hola, ${firstName}`}
    />
  );
  const week = (
    <View style={styles.week}>
      <View style={styles.weekTitle}>
        <View style={styles.weekLabel}>
          <CardLabel>Esta semana · clases por día</CardLabel>
        </View>
        <Pressable
          accessibilityLabel="Hoy"
          accessibilityRole="button"
          onPress={() => setSelectedDate(today)}
          hitSlop={{ bottom: 4, left: 0, right: 0, top: 4 }}
          style={styles.todayButton}
          testID="agenda-today"
        >
          <Text variant="compacto">Hoy</Text>
        </Pressable>
      </View>
      <DayStrip
        counts={counts}
        dates={dates}
        onSelect={setSelectedDate}
        selected={selectedDate}
        testIDPrefix="agenda-day"
        today={today}
      />
    </View>
  );

  if (schedule.isPending)
    return (
      <Screen style={styles.screen}>
        {header}
        <View style={styles.loading}>
          {week}
          <LoadingState label="Cargando agenda" />
        </View>
      </Screen>
    );
  if (schedule.isError || schedule.data.status !== 200)
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar tu agenda."
          onRetry={() => void schedule.refetch()}
        />
      </Screen>
    );

  const sessions = schedule.data?.data ?? [];
  const dayName = isToday ? "Hoy" : dayHeading(selectedDate).split(" ")[0];
  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={bodyScroll.content}
        refreshControl={refreshControl}
        style={bodyScroll.scroll}
        testID="agenda-scroll"
      >
        <View style={[styles.column, tablet && styles.tablet]} testID="agenda-column">
          {week}
          {sessions.length === 0 ? (
            <StateScreen
              icon="calendar"
              layout="inList"
              note={
                isToday ? undefined : "Elige otro día de la semana o vuelve a tus clases de hoy."
              }
              title={
                isToday
                  ? "Hoy no tienes clases"
                  : `El ${dayHeading(selectedDate).toLowerCase().split(" ").slice(0, 2).join(" ")} no tienes clases`
              }
            >
              {isToday ? null : (
                // Board I04: the way back to today is the secondary button.
                <View style={styles.backToToday}>
                  <OutlinedButton
                    label="Ver mis clases de hoy"
                    onPress={() => setSelectedDate(today)}
                  />
                </View>
              )}
            </StateScreen>
          ) : (
            <AgendaDay
              heading={agendaHeading(dayName, sessions)}
              isToday={isToday}
              now={new Date()}
              onOpen={(sessionId) => navigation.navigate("Roster", { sessionId })}
              sessions={sessions}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backToToday: { alignSelf: "stretch", marginTop: spacing.xs },
  column: { gap: spacing.smLg },
  loading: { gap: spacing.smLg, paddingTop: spacing.md },
  screen: { paddingHorizontal: spacing.xlSm },
  // E1 B on a tablet: a phone's column, centred, so the hero never stretches.
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
  // Board I01: a secondary chip, white with a 400 outline, at the card's end.
  todayButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderWidth: 1.5,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  // The week sits in its own white card, its label inside (board I01).
  week: {
    ...surfaces.card,
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.mdLg,
  },
  weekTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingLeft: spacing.xs,
  },
  weekLabel: { flex: 1 },
});
