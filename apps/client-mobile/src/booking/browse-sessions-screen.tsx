import {
  getListSessionAvailabilityQueryKey,
  useListBranches,
  useListClassTypes,
  useListSessionAvailability,
} from "@pilates/api-contracts";
import {
  BodyText,
  bookingStripDays,
  boliviaCivilDate,
  civilDateRange,
  colors,
  fontFamilies,
  formatSessionDate,
  formatTimeRange,
  hasStarted,
  Heading,
  LoadingState,
  PickerCheck,
  QueryFailure,
  radii,
  Screen,
  spacing,
  typography,
  upcomingCivilDates,
  usePullToRefresh,
  useRefetchOnFocus,
  useStudioRules,
  weeklyClassesLeftLine,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { BrowseEmptyState } from "./browse-empty-state";
import { BranchLine, ClassTypeStrip, DayStrip } from "./browse-filters";
import { SessionRow, seatsTag } from "./session-row";

type BrowseNavigation = {
  navigate: (screen: "SessionDetail", params: { sessionId: string }) => void;
};

const allClassTypes = "all";

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function BrowseSessionsScreen() {
  const navigation = useNavigation<BrowseNavigation>();
  const fetcher = useClientFetcher();
  const today = boliviaCivilDate(new Date());
  const stripDays = bookingStripDays(useStudioRules(fetcher));
  const dates = useMemo(() => upcomingCivilDates(today, stripDays), [today, stripDays]);
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
        <BranchLine
          count={branchList.length}
          name={selectedBranch.name}
          onToggle={() => setChoosingBranch((open) => !open)}
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
      <DayStrip dates={dates} onSelect={setSelectedDate} selected={selectedDate} today={today} />
      <ClassTypeStrip
        onSelect={setClassTypeId}
        options={[
          { id: allClassTypes, label: "Todas" },
          ...classTypeList.map((classType) => ({ id: classType.id, label: classType.name })),
        ]}
        selected={classTypeId}
      />
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
          <BrowseEmptyState
            branchId={branchId}
            classTypeId={classTypeId}
            classTypeName={classTypeList.find((type) => type.id === classTypeId)?.name}
            dates={dates}
            onSelectDate={setSelectedDate}
            onShowAll={() => setClassTypeId(allClassTypes)}
            selectedDate={selectedDate}
            today={today}
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={refreshControl}
          testID="browse-sessions-scroll"
        >
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>
              {capitalized(formatSessionDate(civilDateRange(selectedDate).from))}
            </Text>
            <Text style={styles.dayCount}>
              {visibleSessions.length === 1 ? "1 clase" : `${visibleSessions.length} clases`}
            </Text>
          </View>
          {visibleSessions.map((session) => {
            const left = weeklyClassesLeftLine(session.classesLeftThisWeek);
            return (
              <View key={session.id} style={styles.item}>
                <SessionRow
                  accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}, ${session.trainerName}, ${seatsTag(session.availableSeats)}`}
                  onPress={() => navigation.navigate("SessionDetail", { sessionId: session.id })}
                  session={session}
                  testID={`session-card-${session.id}`}
                />
                {left === null ? null : <BodyText style={styles.left}>{left}</BodyText>}
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
    backgroundColor: colors.card,
    borderRadius: radii.frame,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  dayCount: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  dayHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  dayTitle: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  empty: { flexGrow: 1 },
  item: { gap: spacing.xs },
  left: { color: colors.textMuted, fontSize: typography.note, paddingHorizontal: spacing.lg },
  list: { gap: spacing.sm, paddingBottom: spacing.xxl, paddingTop: spacing.sm },
  screen: { gap: spacing.lg },
  sheetTitle: { color: colors.textMuted, fontSize: typography.label },
});
