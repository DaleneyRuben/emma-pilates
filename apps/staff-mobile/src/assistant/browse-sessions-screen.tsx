import {
  useListBranches,
  useListClassTypes,
  useListSessionAvailability,
} from "@pilates/api-contracts";
import {
  bookingStrip,
  bookingWindowDays,
  boliviaCivilDate,
  civilDateRange,
  formatTimeRange,
  hasStarted,
  LoadingState,
  OtherDateSheet,
  placesLabel,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  StaffFace,
  StateScreen,
  surfaces,
  upcomingCivilDates,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { bodyScroll, RowCard } from "../profile/card-pieces";
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
import { TabletGrid } from "./assistant-layout";
import { useIsTablet } from "../ui/use-is-tablet";
import { ClientBanner } from "./client-banner";
import { useClientBookedSessionIds } from "./client-booked-sessions";
import type { ClientContext } from "./client-overview-screen";

type BrowseNavigation = {
  goBack: () => void;
  navigate: (screen: "SessionDetail", params: ClientContext & { sessionId: string }) => void;
};

const allClassTypes = "all";

/** S07 Reservar una clase, for the Client named in the banner (v2). */
export function BrowseSessionsScreen({ route }: { route: { params: ClientContext } }) {
  const { clientId, clientName, clientPhoto } = route.params;
  const navigation = useNavigation<BrowseNavigation>();
  const fetcher = useStaffFetcher();
  const tablet = useIsTablet();
  const today = boliviaCivilDate(new Date());
  const windowDays = bookingWindowDays(useStudioRules(fetcher));
  const dates = useMemo(() => upcomingCivilDates(today, windowDays), [today, windowDays]);
  const { strip, later } = bookingStrip(dates);
  const [chosenDate, setSelectedDate] = useState(today);
  const [choosingDate, setChoosingDate] = useState(false);
  // A day chosen before the rules arrived may lie past a shorter window.
  const selectedDate = dates.includes(chosenDate) ? chosenDate : today;
  const pickedLater = later.includes(selectedDate);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [classTypeId, setClassTypeId] = useState(allClassTypes);

  const branches = useListBranches({ fetcher });
  const classTypes = useListClassTypes({ fetcher });
  const bookedSessionIds = useClientBookedSessionIds(clientId);
  const branchList = branches.data?.status === 200 ? branches.data.data : [];
  const branch = branchList.find((candidate) => candidate.id === selectedBranchId) ?? branchList[0];
  const { from, until } = civilDateRange(selectedDate);
  const sessions = useListSessionAvailability(
    { branchId: branch?.id ?? "", from, until, limit: 100, includeCancelled: true },
    {
      fetcher,
      query: { enabled: branch !== undefined, refetchOnMount: "always" },
    },
  );

  const back = <BackBar onBack={() => navigation.goBack()} title="Reservar una clase" />;
  const banner = (
    <ClientBanner action="Reservando para" clientName={clientName} clientPhoto={clientPhoto} />
  );

  if (branches.isPending || classTypes.isPending) {
    return (
      <Screen style={[styles.screen, styles.gapped]}>
        {back}
        {banner}
        <LoadingState label="Cargando sucursales" />
      </Screen>
    );
  }
  if (branches.isError || branch === undefined) {
    return (
      <Screen style={[styles.screen, styles.gapped]}>
        {back}
        {banner}
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
  const nextDate = dates[dates.indexOf(selectedDate) + 1];
  const dayTitle = selectedDate === today ? "Hoy" : dayHeading(selectedDate);
  const { next, rest } = splitNextClass(visible, selectedDate === today, now);
  const exceptionOf = (session: (typeof visible)[number]) =>
    bookedSessionIds.has(session.id)
      ? "Ya reservada"
      : session.availableSeats === 0
        ? "Completa"
        : undefined;
  const openSession = (session: (typeof visible)[number]) =>
    navigation.navigate("SessionDetail", {
      clientId,
      clientName,
      clientPhoto,
      sessionId: session.id,
    });

  const dayLabel = `${dayTitle} · ${countLabel(visible.length, "clase", "clases")}`;
  const rows = rest.map((session) => {
    const exception = exceptionOf(session);
    const places = placesLabel(session.bookedCount, session.capacity);
    return (
      <SessionRow
        key={session.id}
        accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}, ${exception ?? places}`}
        exception={exception}
        onPress={() => openSession(session)}
        places={places}
        standalone={tablet}
        subtitle={session.trainerName}
        subtitleLead={
          <StaffFace
            fetcher={fetcher}
            name={session.trainerName}
            photo={session.trainerPhoto}
            size={20}
          />
        }
        testID={`session-card-${session.id}`}
        time={startTime(session.startsAt, session.endsAt)}
        title={session.classTypeName}
      />
    );
  });

  // E-R01: the band stays put; the Client, the filters card, the next class
  // and the day's card of classes scroll under it.
  return (
    <Screen style={styles.screen}>
      {back}
      <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
        {banner}
        <View style={styles.filters}>
          <BranchField
            onSelect={setSelectedBranchId}
            options={branchList}
            selectedId={branch.id}
            selectedName={branch.name}
          />
          <DayStrip
            dates={strip}
            onSelect={setSelectedDate}
            selected={selectedDate}
            testIDPrefix="assistant-day"
            today={today}
            trailing={
              later.length === 0 ? undefined : (
                <DayStripAction
                  accessibilityLabel={`Elegir otra fecha, hasta ${windowDays} días`}
                  label={pickedLater ? (dayHeading(selectedDate).split(" ")[1] ?? "Otra") : "Otra"}
                  onPress={() => setChoosingDate(true)}
                  selected={pickedLater}
                  testID="assistant-day-other"
                />
              )
            }
          />
          <FilterChips
            onSelect={setClassTypeId}
            options={[
              { id: allClassTypes, label: "Todas" },
              ...classTypeList.map((classType) => ({ id: classType.id, label: classType.name })),
            ]}
            selected={classTypeId}
            testID="assistant-class-type-strip"
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
              note="Elige otro día de la semana para reservar."
              primaryAction={
                nextDate === undefined
                  ? undefined
                  : { label: "Ver mañana", onPress: () => setSelectedDate(nextDate) }
              }
              title={
                allCancelled ? allCancelledTitle(selectedDate, today) : "Este día no hay clases"
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
          <>
            {/* The day's count heads its card; a lone hero keeps it as a title. */}
            {rest.length === 0 || tablet ? <SectionTitle>{dayLabel}</SectionTitle> : null}
            {next === undefined ? null : (
              <TodayHero
                accessibilityLabel={`${next.classTypeName} ${formatTimeRange(next.startsAt, next.endsAt)}, ${exceptionOf(next) ?? placesLabel(next.bookedCount, next.capacity)}`}
                detail={`${next.branchName} · ${next.trainerName}`}
                now={now}
                onPress={() => openSession(next)}
                places={exceptionOf(next) ?? placesLabel(next.bookedCount, next.capacity)}
                startsAt={next.startsAt}
                testID={`session-card-${next.id}`}
                title={`${startTime(next.startsAt, next.endsAt)} · ${next.classTypeName}`}
              />
            )}
            {rest.length === 0 ? null : tablet ? (
              <TabletGrid testID="assistant-session-grid">{rows}</TabletGrid>
            ) : (
              <RowCard label={dayLabel} testID="assistant-session-grid">
                {rows}
              </RowCard>
            )}
          </>
        )}
      </ScrollView>
      <OtherDateSheet
        dates={later}
        onClose={() => setChoosingDate(false)}
        onSelect={(date) => {
          setSelectedDate(date);
          setChoosingDate(false);
        }}
        selected={selectedDate}
        testIDPrefix="assistant-other"
        visible={choosingDate}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // E-R01: the Branch, the days and the class types share one white card.
  filters: {
    ...surfaces.card,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.mdLg,
  },
  gapped: { gap: spacing.md },
  screen: { paddingHorizontal: spacing.xlSm },
});
