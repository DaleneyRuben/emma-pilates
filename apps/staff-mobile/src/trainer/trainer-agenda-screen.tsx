import {
  getListTrainerScheduleQueryKey,
  listTrainerSchedule,
  useGetCurrentStaffMemberProfile,
  useListTrainerSchedule,
} from "@pilates/api-contracts";
import {
  BodyText,
  boliviaCivilDate,
  CardFooter,
  Chevron,
  colors,
  DetailLine,
  fontFamilies,
  formatTimeRange,
  LoadingState,
  QueryFailure,
  radii,
  Screen,
  SeatPill,
  spacing,
  surfaces,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";
import { requireOk } from "./require-ok";

type TrainerAgendaNavigation = {
  navigate: (screen: "Roster", params: { sessionId: string }) => void;
};

function addDays(date: string, amount: number): string {
  const result = new Date(`${date}T12:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
}

// S02's agenda card (MOB-042): the chevron beside the time and title, the
// Branch after a pin, then the booked count and a «Completa»/«Con cupos» pill.
function AgendaCard({
  session,
  onPress,
}: {
  session: {
    bookedCount: number;
    branchName: string;
    capacity: number;
    classTypeName: string;
    endsAt: string;
    sessionId: string;
    startsAt: string;
  };
  onPress: () => void;
}) {
  const full = session.bookedCount >= session.capacity;
  return (
    <Pressable
      accessibilityLabel={session.classTypeName}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.card}
      testID={`agenda-session-${session.sessionId}`}
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.time}>{formatTimeRange(session.startsAt, session.endsAt)}</Text>
          <Text style={styles.cardTitle}>{session.classTypeName}</Text>
          <DetailLine icon="pin" iconSize={15} style={styles.branch}>
            {session.branchName}
          </DetailLine>
        </View>
        <Chevron />
      </View>
      <CardFooter paddingTop={13}>
        <DetailLine icon="person" style={styles.booked}>
          {`${session.bookedCount} de ${session.capacity} reservados`}
        </DetailLine>
        <SeatPill full={full}>{full ? "Completa" : "Con cupos"}</SeatPill>
      </CardFooter>
    </Pressable>
  );
}

export function TrainerAgendaScreen() {
  const navigation = useNavigation<TrainerAgendaNavigation>();
  const fetcher = useStaffFetcher();
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const [selectedDate, setSelectedDate] = useState(() => boliviaCivilDate(new Date()));
  const schedule = useListTrainerSchedule(
    { on: selectedDate },
    {
      fetcher,
      query: {
        queryFn: ({ signal }) =>
          listTrainerSchedule({ on: selectedDate }, { signal }, fetcher).then((response) =>
            requireOk(response, "The agenda could not be loaded"),
          ),
        refetchOnMount: "always",
      },
    },
  );
  const dates = useMemo(
    () => [-2, -1, 0, 1, 2, 3, 4].map((offset) => addDays(selectedDate, offset)),
    [selectedDate],
  );
  const queryKeys = [getListTrainerScheduleQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const firstName = profile.data?.status === 200 ? profile.data.data.name.split(" ")[0] : undefined;
  const header = (
    <RootHeader label="Mi agenda" title={firstName === undefined ? "Hola" : `Hola, ${firstName}`} />
  );

  if (schedule.isPending)
    return (
      <Screen style={styles.centered}>
        {header}
        <LoadingState label="Cargando agenda" />
      </Screen>
    );
  if (schedule.isError || schedule.data.status !== 200)
    return (
      <Screen>
        {header}
        <QueryFailure
          label="No pudimos cargar tu agenda."
          onRetry={() => void schedule.refetch()}
        />
      </Screen>
    );

  const sessions = schedule.data?.data ?? [];
  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView
        horizontal
        contentContainerStyle={styles.datePicker}
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
      >
        {dates.map((date) => (
          <Pressable
            accessibilityLabel={date}
            accessibilityRole="button"
            accessibilityState={{ selected: date === selectedDate }}
            key={date}
            onPress={() => setSelectedDate(date)}
            style={[styles.dateButton, date === selectedDate && styles.dateButtonSelected]}
          >
            <Text style={[styles.dateLabel, date === selectedDate && styles.dateLabelSelected]}>
              {date.slice(8)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {sessions.length === 0 ? (
        <ScrollView contentContainerStyle={styles.centered} refreshControl={refreshControl}>
          <BodyText>No tienes clases este día.</BodyText>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={refreshControl}
          testID="agenda-scroll"
        >
          {sessions.map((session) => (
            <AgendaCard
              key={session.sessionId}
              onPress={() => navigation.navigate("Roster", { sessionId: session.sessionId })}
              session={session}
            />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  booked: { color: colors.textSecondary, fontSize: 14, fontVariant: ["tabular-nums"] },
  branch: { color: colors.textMuted, fontSize: typography.note },
  card: { ...surfaces.card, gap: spacing.mdLg, padding: spacing.lgXl },
  cardTitle: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.titleCard,
  },
  centered: { alignItems: "center", flex: 1, gap: spacing.lg, justifyContent: "center" },
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
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  list: { gap: spacing.md, paddingBottom: spacing.lg },
  screen: { gap: spacing.md },
  // The date strip keeps its height when the list below is long.
  strip: { flexGrow: 0, flexShrink: 0 },
  time: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.note,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
    letterSpacing: 0.78,
  },
  titles: { flexShrink: 1, gap: spacing.smd },
});
