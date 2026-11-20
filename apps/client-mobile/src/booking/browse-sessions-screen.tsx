import {
  getListSessionAvailabilityQueryKey,
  useListBranches,
  useListClassTypes,
  useListSessionAvailability,
} from "@pilates/api-contracts";
import {
  bookingStrip,
  bookingWindowDays,
  boliviaCivilDate,
  civilDateRange,
  ClassList,
  colors,
  fontFamilies,
  formatSessionDate,
  formatTimeRange,
  hasStarted,
  LoadingState,
  OtherDateSheet,
  QueryFailure,
  Screen,
  ScreenHeader,
  spacing,
  StaffFace,
  surfaces,
  typography,
  upcomingCivilDates,
  usePullToRefresh,
  useRefetchOnFocus,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { BrowseEmptyState } from "./browse-empty-state";
import { BranchLine, BranchSheet, ClassTypeStrip, DayStrip, DayStripOther } from "./browse-filters";
import { SessionRow, seatsTag } from "./session-row";
import { WeekNotice, weekOf } from "./browse-week-notice";
import {
  dayBackFromFreeze,
  FrozenDayCard,
  FrozenLegend,
  isFrozen,
  useApprovedFreeze,
} from "./frozen-day";

type BrowseNavigation = {
  navigate: {
    (screen: "SessionDetail", params: { sessionId: string }): void;
    (screen: "Subscription"): void;
  };
};

const allClassTypes = "all";

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function BrowseSessionsScreen() {
  const navigation = useNavigation<BrowseNavigation>();
  const fetcher = useClientFetcher();
  const today = boliviaCivilDate(new Date());
  const windowDays = bookingWindowDays(useStudioRules(fetcher));
  const dates = useMemo(() => upcomingCivilDates(today, windowDays), [today, windowDays]);
  const { strip, later } = bookingStrip(dates);
  const [chosenDate, setSelectedDate] = useState(today);
  const [choosingDate, setChoosingDate] = useState(false);
  // A day chosen before the rules arrived may lie past a shorter window.
  const selectedDate = dates.includes(chosenDate) ? chosenDate : today;
  const pickedLater = later.includes(selectedDate);
  const freeze = useApprovedFreeze(fetcher, today);
  const frozenDay = isFrozen(selectedDate, freeze);
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
  // Every Session of one day falls in the same week, so the first says it.
  // A day without classes, or still loading, keeps its week's last count so
  // the strip does not jump (review of FIX-082).
  const counted =
    sessions.data?.status === 200 ? sessions.data.data[0]?.classesLeftThisWeek : undefined;
  const [lastCount, setLastCount] = useState<{ week: string; left: number | null } | null>(null);
  const week = weekOf(selectedDate);
  if (counted !== undefined && (lastCount?.week !== week || lastCount.left !== counted)) {
    setLastCount({ week, left: counted });
  }
  const classesLeft =
    counted !== undefined ? counted : lastCount?.week === week ? lastCount.left : undefined;

  return (
    <Screen style={styles.screen}>
      {/* C03: the band holds the Branch, the week's notice and the days. */}
      <ScreenHeader testID="browse-header" title="Reservar">
        {selectedBranch ? (
          <BranchLine
            count={branchList.length}
            name={selectedBranch.name}
            onToggle={() => setChoosingBranch((open) => !open)}
            open={choosingBranch}
          />
        ) : null}
        <WeekNotice classesLeft={classesLeft} selectedDate={selectedDate} today={today} />
        <DayStrip
          dates={strip}
          frozen={(date) => isFrozen(date, freeze)}
          onSelect={setSelectedDate}
          selected={selectedDate}
          today={today}
          trailing={
            later.length === 0 ? undefined : (
              <DayStripOther
                accessibilityLabel={`Elegir otra fecha, hasta ${windowDays} días`}
                label={pickedLater ? String(Number(selectedDate.slice(8, 10))) : "Otra"}
                onPress={() => setChoosingDate(true)}
                selected={pickedLater}
              />
            )
          }
        />
        {freeze !== null && !frozenDay && dates.some((date) => isFrozen(date, freeze)) ? (
          <FrozenLegend freeze={freeze} />
        ) : null}
      </ScreenHeader>
      {choosingBranch ? (
        <BranchSheet
          branches={branchList}
          onSelect={(id) => {
            setSelectedBranchId(id);
            setChoosingBranch(false);
          }}
          selectedId={branchId}
        />
      ) : null}
      <ClassTypeStrip
        onSelect={setClassTypeId}
        options={[
          { id: allClassTypes, label: "Todas" },
          ...classTypeList.map((classType) => ({ id: classType.id, label: classType.name })),
        ]}
        selected={classTypeId}
      />
      {frozenDay && freeze !== null ? (
        <ScrollView contentContainerStyle={styles.list} refreshControl={refreshControl}>
          <FrozenDayCard
            backOn={dayBackFromFreeze(freeze, dates)}
            day={selectedDate}
            freeze={freeze}
            onOpenFreeze={() => navigation.navigate("Subscription")}
            onShowDay={setSelectedDate}
          />
        </ScrollView>
      ) : loading ? (
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
          <View style={styles.dayHeader} testID="browse-day-header">
            <Text style={styles.dayTitle}>
              {capitalized(formatSessionDate(civilDateRange(selectedDate).from))}
            </Text>
            <Text style={styles.dayCount}>
              {visibleSessions.length === 1 ? "1 clase" : `${visibleSessions.length} clases`}
            </Text>
          </View>
          <ClassList testID="browse-session-group">
            {visibleSessions.map((session) => (
              <SessionRow
                accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}, ${session.trainerName}, ${seatsTag(session)}`}
                key={session.id}
                onPress={() => navigation.navigate("SessionDetail", { sessionId: session.id })}
                session={session}
                testID={`session-card-${session.id}`}
                trainerFace={
                  <StaffFace
                    fetcher={fetcher}
                    name={session.trainerName}
                    photo={session.trainerPhoto}
                    size={20}
                  />
                }
              />
            ))}
          </ClassList>
        </ScrollView>
      )}
      <OtherDateSheet
        dates={later}
        onClose={() => setChoosingDate(false)}
        onSelect={(date) => {
          setSelectedDate(date);
          setChoosingDate(false);
        }}
        selected={selectedDate}
        testIDPrefix="browse-other"
        visible={choosingDate}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayCount: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.note,
    fontWeight: "700",
  },
  // C03: the day's date is a white strip card above its classes.
  dayHeader: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dayTitle: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 11 * 0.14,
    textTransform: "uppercase",
  },
  empty: { flexGrow: 1, paddingBottom: spacing.xxl, paddingTop: spacing.xxs },
  list: { gap: spacing.md, paddingBottom: spacing.xxl, paddingTop: spacing.xxs },
  screen: { gap: spacing.md },
});
