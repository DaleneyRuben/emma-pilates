import {
  getListSessionAvailabilityQueryKey,
  useListBranches,
  useListClassTypes,
  useListSessionAvailability,
} from "@pilates/api-contracts";
import {
  BodyText,
  BranchPickerPill,
  colors,
  Heading,
  LoadingState,
  PickerCheck,
  QueryFailure,
  radii,
  Screen,
  SeatPill,
  SessionCard,
  spacing,
  weeklyClassesLeftLine,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import {
  boliviaCivilDate,
  civilDateRange,
  dayChipLabel,
  formatTimeRange,
  hasStarted,
  upcomingCivilDates,
} from "@pilates/mobile-core";

type BrowseNavigation = {
  navigate: (screen: "SessionDetail", params: { sessionId: string }) => void;
};

const allClassTypes = "all";

function seatsTag(availableSeats: number): string {
  if (availableSeats === 0) return "Lleno";
  return availableSeats === 1 ? "1 cupo" : `${availableSeats} cupos`;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function BrowseSessionsScreen() {
  const navigation = useNavigation<BrowseNavigation>();
  const fetcher = useClientFetcher();
  const today = boliviaCivilDate(new Date());
  const dates = useMemo(() => upcomingCivilDates(today, 7), [today]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [classTypeId, setClassTypeId] = useState(allClassTypes);
  const [choosingBranch, setChoosingBranch] = useState(false);

  const branches = useListBranches({ fetcher });
  const classTypes = useListClassTypes({ fetcher });
  const branchId =
    selectedBranchId ?? (branches.data?.status === 200 ? branches.data.data[0]?.id : undefined);
  const { from, until } = civilDateRange(selectedDate);
  const sessions = useListSessionAvailability(
    { branchId: branchId ?? "", from, until, limit: 100 },
    {
      fetcher,
      query: { enabled: branchId !== undefined, refetchOnMount: "always" },
    },
  );
  const queryKeys = [getListSessionAvailabilityQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const branchList = branches.data?.status === 200 ? branches.data.data : [];
  const classTypeList = classTypes.data?.status === 200 ? classTypes.data.data : [];
  const selectedBranch = branchList.find((branch) => branch.id === branchId);
  const now = new Date();
  const visibleSessions =
    sessions.data?.status === 200
      ? sessions.data.data.filter(
          (session) =>
            !hasStarted(session.startsAt, now) &&
            (classTypeId === allClassTypes || session.classTypeId === classTypeId),
        )
      : [];

  const failed =
    branches.isError ||
    (branches.data !== undefined && branches.data.status !== 200) ||
    sessions.isError ||
    (sessions.data !== undefined && sessions.data.status !== 200);
  const loading = branches.isPending || (branchId !== undefined && sessions.isPending);

  return (
    <Screen style={styles.screen}>
      <Heading accessibilityLabel="Reservar">Reservar una clase</Heading>
      {selectedBranch ? (
        <BranchPickerPill
          name={selectedBranch.name}
          onPress={() => setChoosingBranch((open) => !open)}
          open={choosingBranch}
        />
      ) : null}
      {choosingBranch ? (
        <View style={styles.branchSheet}>
          <BodyText style={styles.sheetTitle}>Elige una sucursal</BodyText>
          {branchList.map((branch) => (
            <Pressable
              accessibilityLabel={branch.name}
              accessibilityRole="button"
              accessibilityState={{ selected: branch.id === branchId }}
              key={branch.id}
              onPress={() => {
                setSelectedBranchId(branch.id);
                setChoosingBranch(false);
              }}
              style={styles.branchRow}
            >
              <View style={styles.branchText}>
                <Text
                  style={[styles.branchName, branch.id === branchId && styles.branchNameSelected]}
                >
                  {branch.name}
                </Text>
                <BodyText style={styles.branchAddress}>{branch.address}</BodyText>
              </View>
              <PickerCheck selected={branch.id === branchId} testID={`picker-check-${branch.id}`} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.chipRow}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        testID="browse-day-strip"
      >
        {dates.map((date) => {
          const label = dayChipLabel(date);
          const selected = date === selectedDate;
          return (
            <Pressable
              accessibilityLabel={`${label.weekday} ${label.day}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={date}
              onPress={() => setSelectedDate(date)}
              style={[styles.dayChip, selected && styles.chipSelected]}
              testID={`browse-day-${date}`}
            >
              <Text style={[styles.dayWeekday, selected && styles.chipLabelSelected]}>
                {label.weekday}
              </Text>
              <Text style={[styles.dayNumber, selected && styles.chipLabelSelected]}>
                {label.day}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView
        contentContainerStyle={styles.chipRow}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        testID="browse-class-type-strip"
      >
        <Chip
          label="Todas"
          onPress={() => setClassTypeId(allClassTypes)}
          selected={classTypeId === allClassTypes}
        />
        {classTypeList.map((classType) => (
          <Chip
            key={classType.id}
            label={classType.name}
            onPress={() => setClassTypeId(classType.id)}
            selected={classTypeId === classType.id}
          />
        ))}
      </ScrollView>
      {loading ? (
        <LoadingState label="Cargando clases" />
      ) : failed ? (
        <QueryFailure
          label="No pudimos cargar las clases."
          onRetry={() => {
            void branches.refetch();
            void sessions.refetch();
          }}
        />
      ) : visibleSessions.length === 0 ? (
        <ScrollView contentContainerStyle={styles.empty} refreshControl={refreshControl}>
          <BodyText>
            {classTypeId === allClassTypes
              ? "No hay clases este día."
              : "No hay clases con este filtro"}
          </BodyText>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={refreshControl}
          testID="browse-sessions-scroll"
        >
          {visibleSessions.map((session) => {
            const left = weeklyClassesLeftLine(session.classesLeftThisWeek);
            return (
              <View key={session.id}>
                <SessionCard
                  accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}, ${session.trainerName}, ${seatsTag(session.availableSeats)}`}
                  onPress={() => navigation.navigate("SessionDetail", { sessionId: session.id })}
                  tag={
                    <SeatPill full={session.availableSeats === 0}>
                      {seatsTag(session.availableSeats)}
                    </SeatPill>
                  }
                  testID={`session-card-${session.id}`}
                  time={formatTimeRange(session.startsAt, session.endsAt)}
                  title={session.classTypeName}
                  trainerName={session.trainerName}
                />
                {left === null ? null : <BodyText>{left}</BodyText>}
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  branchAddress: { fontSize: typography.note },
  branchName: { color: colors.text, fontSize: typography.body },
  branchNameSelected: { color: colors.primaryDeep },
  branchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  branchText: { flex: 1, gap: spacing.xxs },
  branchSheet: {
    backgroundColor: colors.white,
    borderRadius: radii.frame,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipLabel: { color: colors.text, fontSize: typography.body },
  chipLabelSelected: { color: colors.white },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  // Horizontal strips keep their natural height: spare tablet height would
  // stretch them and an open Branch list would squash them.
  strip: { flexGrow: 0, flexShrink: 0 },
  dayChip: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderWidth: 1,
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.lg,
  },
  dayNumber: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  dayWeekday: { color: colors.textMuted, fontSize: typography.label },
  empty: { paddingVertical: spacing.xl },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  screen: { gap: spacing.md },
  sheetTitle: { color: colors.textMuted, fontSize: typography.label },
});
