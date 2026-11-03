import {
  useListBranches,
  useListClassTypes,
  useListSessionAvailability,
  type SessionAvailabilityDto,
} from "@pilates/api-contracts";
import {
  bookingStripDays,
  boliviaCivilDate,
  civilDateRange,
  formatTimeRange,
  hasStarted,
  LoadingState,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  StateScreen,
  upcomingCivilDates,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { BranchField } from "../ui/branch-field";
import { DayStrip } from "../ui/day-strip";
import { FilterChips } from "../ui/filter-chips";
import { SessionRow } from "../ui/session-row";
import { countLabel, dayHeading, noClassesOfType, startTime } from "../ui/session-time";
import { TabletGrid } from "./assistant-layout";
import { ClientBanner } from "./client-banner";
import { useClientBookedSessionIds } from "./client-booked-sessions";
import type { ClientContext } from "./client-overview-screen";

type BrowseNavigation = {
  goBack: () => void;
  navigate: (screen: "SessionDetail", params: ClientContext & { sessionId: string }) => void;
};

const allClassTypes = "all";

function seatsTag(session: SessionAvailabilityDto): string {
  if (session.availableSeats === 0) return "Completa";
  return countLabel(session.availableSeats, "cupo", "cupos");
}

/** S07 Reservar una clase, for the Client named in the banner (v2). */
export function BrowseSessionsScreen({ route }: { route: { params: ClientContext } }) {
  const { clientId, clientName } = route.params;
  const navigation = useNavigation<BrowseNavigation>();
  const fetcher = useStaffFetcher();
  const today = boliviaCivilDate(new Date());
  const stripDays = bookingStripDays(useStudioRules(fetcher));
  const dates = useMemo(() => upcomingCivilDates(today, stripDays), [today, stripDays]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [classTypeId, setClassTypeId] = useState(allClassTypes);

  const branches = useListBranches({ fetcher });
  const classTypes = useListClassTypes({ fetcher });
  const bookedSessionIds = useClientBookedSessionIds(clientId);
  const branchList = branches.data?.status === 200 ? branches.data.data : [];
  const branch = branchList.find((candidate) => candidate.id === selectedBranchId) ?? branchList[0];
  const { from, until } = civilDateRange(selectedDate);
  const sessions = useListSessionAvailability(
    { branchId: branch?.id ?? "", from, until, limit: 100 },
    {
      fetcher,
      query: { enabled: branch !== undefined, refetchOnMount: "always" },
    },
  );

  const header = (
    <>
      <BackBar onBack={() => navigation.goBack()} title="Reservar una clase" />
      <ClientBanner action="Reservando para" clientName={clientName} />
    </>
  );

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
  const visible = (sessions.data?.status === 200 ? sessions.data.data : []).filter(
    (session) =>
      !hasStarted(session.startsAt, now) &&
      (classTypeId === allClassTypes || session.classTypeId === classTypeId),
  );
  const nextDate = dates[dates.indexOf(selectedDate) + 1];
  const dayTitle = selectedDate === today ? "Hoy" : dayHeading(selectedDate);

  return (
    <Screen style={styles.screen}>
      {header}
      <BranchField
        onSelect={setSelectedBranchId}
        options={branchList}
        selectedId={branch.id}
        selectedName={branch.name}
      />
      <DayStrip
        dates={dates}
        onSelect={setSelectedDate}
        selected={selectedDate}
        testIDPrefix="assistant-day"
        today={today}
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
            title="Este día no hay clases"
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
        <ScrollView contentContainerStyle={styles.list}>
          <SectionTitle>
            {`${dayTitle} · ${countLabel(visible.length, "clase", "clases")}`}
          </SectionTitle>
          <TabletGrid testID="assistant-session-grid">
            {visible.map((session) => {
              const booked = bookedSessionIds.has(session.id);
              const tag = booked ? "Ya reservada" : seatsTag(session);
              return (
                <SessionRow
                  key={session.id}
                  accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}, ${tag}`}
                  onPress={() =>
                    navigation.navigate("SessionDetail", {
                      clientId,
                      clientName,
                      sessionId: session.id,
                    })
                  }
                  pill={tag}
                  // Her own Booking takes the neutral pill, like a full class.
                  pillTone={booked || session.availableSeats === 0 ? "neutral" : "tint"}
                  subtitle={session.trainerName}
                  testID={`session-card-${session.id}`}
                  time={startTime(session.startsAt, session.endsAt)}
                  title={session.classTypeName}
                />
              );
            })}
          </TabletGrid>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  screen: { gap: spacing.lg, paddingHorizontal: spacing.xlSm },
});
