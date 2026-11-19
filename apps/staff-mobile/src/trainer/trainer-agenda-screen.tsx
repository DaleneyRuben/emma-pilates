import {
  getListTrainerScheduleQueryKey,
  listTrainerSchedule,
  useGetCurrentStaffMemberProfile,
  useListTrainerSchedule,
  staffRoleLabel,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  colors,
  fontFamilies,
  LoadingState,
  QueryFailure,
  radii,
  Screen,
  SectionTitle,
  spacing,
  StateScreen,
  upcomingCivilDates,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { DayStrip } from "../ui/day-strip";
import { RootHeader } from "../ui/root-header";
import { dayHeading } from "../ui/session-time";
import { agendaHeading } from "./agenda-cancellations";
import { AgendaDay } from "./agenda-day";
import { requireOk } from "./require-ok";

type TrainerAgendaNavigation = {
  navigate: (screen: "Roster", params: { sessionId: string }) => void;
};

/**
 * S02 Mi agenda (v2): it opens on today and shows no past day, since
 * attendance is never corrected (owner, 2026-11-02); «Hoy» comes back to it.
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
    query: {
      queryFn: ({ signal }) =>
        listTrainerSchedule(params, { signal }, fetcher).then((response) =>
          requireOk(response, "The agenda could not be loaded"),
        ),
      refetchOnMount: "always",
    },
  });
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
        <SectionTitle>Esta semana</SectionTitle>
        <Pressable
          accessibilityLabel="Hoy"
          accessibilityRole="button"
          onPress={() => setSelectedDate(today)}
          hitSlop={{ bottom: 4, left: 0, right: 0, top: 4 }}
          style={styles.todayButton}
          testID="agenda-today"
        >
          <Text style={styles.todayLabel}>Hoy</Text>
        </Pressable>
      </View>
      <DayStrip
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
        {week}
        <LoadingState label="Cargando agenda" />
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
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
        testID="agenda-scroll"
      >
        {header}
        {week}
        {sessions.length === 0 ? (
          <StateScreen
            icon="calendar"
            layout="inList"
            note={isToday ? undefined : "Elige otro día de la semana o vuelve a tus clases de hoy."}
            primaryAction={
              isToday
                ? undefined
                : { label: "Ver mis clases de hoy", onPress: () => setSelectedDate(today) }
            }
            title={
              isToday
                ? "Hoy no tienes clases"
                : `El ${dayHeading(selectedDate).toLowerCase().split(" ").slice(0, 2).join(" ")} no tienes clases`
            }
          />
        ) : (
          <View>
            <SectionTitle>{agendaHeading(dayName, sessions)}</SectionTitle>
            <AgendaDay
              isToday={isToday}
              now={new Date()}
              onOpen={(sessionId) => navigation.navigate("Roster", { sessionId })}
              sessions={sessions}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  screen: { gap: spacing.xl, paddingHorizontal: spacing.xlSm },
  // FIX-089: a secondary chip, Crema with a Rosa profundo outline.
  todayButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.mdLg,
  },
  todayLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    fontWeight: "600",
  },
  week: { gap: spacing.md },
  weekTitle: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
