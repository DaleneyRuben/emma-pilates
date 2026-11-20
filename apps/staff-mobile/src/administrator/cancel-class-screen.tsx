import {
  useListAdministratorSessions,
  useListBranches,
  useListClassTypes,
  useListSessionAvailability,
  type SessionAvailabilityDto,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  civilDateRange,
  formatTimeRange,
  hasStarted,
  LoadingState,
  OtherDateSheet,
  placesLabel,
  QueryFailure,
  Screen,
  spacing,
  StateScreen,
  surfaces,
  upcomingCivilDates,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { bodyScroll, RowCard } from "../ui/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { BranchField } from "../ui/branch-field";
import { DayStrip, DayStripAction } from "../ui/day-strip";
import { FilterChips } from "../ui/filter-chips";
import { SessionRow } from "../ui/session-row";
import { TodayHero } from "../ui/today-hero";
import { splitNextClass } from "../trainer/next-class";
import {
  allCancelledTitle,
  countLabel,
  dayHeading,
  noClassesOfType,
  startTime,
} from "../ui/session-time";

export type CancellableSession = SessionAvailabilityDto & { branchName: string };

type CancelClassNavigation = {
  goBack: () => void;
  navigate: (screen: "CancelSession", params: { session: CancellableSession }) => void;
};

const allClassTypes = "all";
const everyBranch = "all";
// Walkthrough 23: cancelling reaches the 30 days the schedule is published for.
const horizonDays = 30;
// Six days and «Otra» share the strip (S13).
const stripDays = 6;

/** S13 Cancelar una clase (v2), for the Administrator and the Coordinator. */
export function CancelClassScreen() {
  const navigation = useNavigation<CancelClassNavigation>();
  const fetcher = useStaffFetcher();
  const today = boliviaCivilDate(new Date());
  const days = useMemo(() => upcomingCivilDates(today, horizonDays), [today]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [classTypeId, setClassTypeId] = useState(allClassTypes);
  const [choosingDate, setChoosingDate] = useState(false);

  const branches = useListBranches({ fetcher });
  const classTypes = useListClassTypes({ fetcher });
  const branchList = branches.data?.status === 200 ? branches.data.data : [];
  const allBranches = selectedBranchId === everyBranch;
  const branch = branchList.find((candidate) => candidate.id === selectedBranchId) ?? branchList[0];
  const { from, until } = civilDateRange(selectedDate);
  const branchSessions = useListSessionAvailability(
    { branchId: branch?.id ?? "", from, until, limit: 100, includeCancelled: true },
    {
      fetcher,
      query: { enabled: branch !== undefined && !allBranches, refetchOnMount: "always" },
    },
  );
  // API-002: an Administrator acts on every Branch, so one search spans them.
  const everySession = useListAdministratorSessions(
    { from, until, limit: 100, includeCancelled: true },
    { fetcher, query: { enabled: allBranches, refetchOnMount: "always" } },
  );
  const sessions = allBranches ? everySession : branchSessions;

  const header = <BackBar onBack={() => navigation.goBack()} title="Cancelar una clase" />;
  if (branches.isPending || classTypes.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando sucursales" />
      </Screen>
    );
  }
  if (branches.isError || branch === undefined) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar las sucursales."
          onRetry={() => void branches.refetch()}
        />
      </Screen>
    );
  }

  const classTypeList = classTypes.data?.status === 200 ? classTypes.data.data : [];
  const typeName = classTypeList.find((classType) => classType.id === classTypeId)?.name;
  const now = new Date();
  // FIX-090: cancelled classes come too, only to tell an all-cancelled day apart.
  const ofType = (sessions.data?.status === 200 ? sessions.data.data : []).filter(
    (session) => classTypeId === allClassTypes || session.classTypeId === classTypeId,
  );
  const visible = ofType.filter(
    (session) => (session.cancellation ?? null) === null && !hasStarted(session.startsAt, now),
  );
  const allCancelled =
    ofType.length > 0 && ofType.every((session) => (session.cancellation ?? null) !== null);
  const strip = days.slice(0, stripDays);
  const later = days.slice(stripDays);
  const pickedLater = later.includes(selectedDate);
  const isToday = selectedDate === today;
  const { next, rest } = splitNextClass(visible, isToday, now);
  const branchNameOf = (session: (typeof visible)[number]) =>
    allBranches ? session.branchName : branch.name;
  const openSession = (session: (typeof visible)[number]) =>
    navigation.navigate("CancelSession", {
      session: { ...session, branchName: branchNameOf(session) },
    });

  return (
    <Screen style={styles.screen}>
      {header}
      {/* E-D12: the Branch, the days and the class types share one white card. */}
      <View style={styles.filters}>
        <BranchField
          allLabel="Todas las sucursales"
          onSelect={setSelectedBranchId}
          options={branchList}
          selectedId={allBranches ? everyBranch : branch.id}
          selectedName={allBranches ? "Todas las sucursales" : branch.name}
        />
        <DayStrip
          dates={strip}
          onSelect={setSelectedDate}
          selected={selectedDate}
          testIDPrefix="cancel-class-day"
          today={today}
          trailing={
            <DayStripAction
              accessibilityLabel="Elegir otra fecha, hasta 30 días"
              label={pickedLater ? (dayHeading(selectedDate).split(" ")[1] ?? "Otra") : "Otra"}
              onPress={() => setChoosingDate(true)}
              selected={pickedLater}
              testID="cancel-class-other"
            />
          }
        />
        <FilterChips
          onSelect={setClassTypeId}
          options={[
            { id: allClassTypes, label: "Todas" },
            ...classTypeList.map((classType) => ({ id: classType.id, label: classType.name })),
          ]}
          selected={classTypeId}
        />
      </View>
      {sessions.isPending ? (
        <LoadingState label="Cargando clases" />
      ) : sessions.isError ? (
        <QueryFailure
          label="No pudimos cargar las clases."
          onRetry={() => void sessions.refetch()}
        />
      ) : visible.length === 0 ? (
        typeName === undefined ? (
          <StateScreen
            icon="calendar"
            layout="inList"
            note="Elige otro día o una fecha más adelante."
            textAction={{ label: "Elegir otra fecha", onPress: () => setChoosingDate(true) }}
            title={
              allCancelled
                ? allCancelledTitle(selectedDate, today)
                : isToday
                  ? "Hoy no hay clases para cancelar"
                  : "Este día no hay clases"
            }
          />
        ) : (
          <StateScreen
            icon="calendar"
            layout="inList"
            note="Prueba otro día o mira todas las clases de este día."
            primaryAction={{
              label: "Ver todas las clases",
              onPress: () => setClassTypeId(allClassTypes),
            }}
            title={noClassesOfType(selectedDate, today, typeName)}
          />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.list} style={bodyScroll.scroll}>
          {next === undefined ? null : (
            <TodayHero
              accessibilityLabel={`${next.classTypeName} ${formatTimeRange(next.startsAt, next.endsAt)}${allBranches ? ` · ${branchNameOf(next)}` : ""}`}
              detail={`${branchNameOf(next)} · ${next.trainerName}`}
              now={now}
              onPress={() => openSession(next)}
              places={placesLabel(next.bookedCount, next.capacity)}
              startsAt={next.startsAt}
              testID={`cancel-class-card-${next.id}`}
              title={`${startTime(next.startsAt, next.endsAt)} · ${next.classTypeName}`}
            />
          )}
          <RowCard
            label={`${dayHeading(selectedDate)} · ${countLabel(visible.length, "clase", "clases")}`}
            testID="class-list"
          >
            {rest.map((session) => {
              const branchName = allBranches ? session.branchName : branch.name;
              return (
                <SessionRow
                  accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}${allBranches ? ` · ${branchName}` : ""}`}
                  key={session.id}
                  onPress={() => openSession(session)}
                  places={placesLabel(session.bookedCount, session.capacity)}
                  subtitle={
                    allBranches ? `${session.trainerName} · ${branchName}` : session.trainerName
                  }
                  testID={`cancel-class-card-${session.id}`}
                  time={startTime(session.startsAt, session.endsAt)}
                  title={session.classTypeName}
                />
              );
            })}
          </RowCard>
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
        testIDPrefix="cancel-class-other"
        visible={choosingDate}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    ...surfaces.card,
    gap: spacing.smLg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.mdLg,
  },
  list: { ...bodyScroll.content, paddingTop: 0 },
  screen: { gap: spacing.smLg, paddingHorizontal: spacing.xlSm },
});
