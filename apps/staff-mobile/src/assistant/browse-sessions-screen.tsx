import {
  useListBranches,
  useListClassTypes,
  useListSessionAvailability,
  type SessionAvailabilityDto,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  boliviaCivilDate,
  civilDateRange,
  colors,
  dayChipLabel,
  formatSessionDate,
  formatTimeRange,
  Heading,
  QueryFailure,
  radii,
  Screen,
  spacing,
  typography,
  upcomingCivilDates,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { describeCount } from "../administrator/administrator-format";
import { useStaffFetcher } from "../staff-fetcher";
import { TabletGrid } from "./assistant-layout";
import { ClientBanner } from "./client-banner";
import type { ClientContext } from "./client-overview-screen";

type BrowseNavigation = {
  goBack: () => void;
  navigate: (
    screen: "SessionDetail",
    params: ClientContext & { sessionId: string },
  ) => void;
};

const allClassTypes = "all";

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
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function seatsTag(session: SessionAvailabilityDto): string {
  if (session.availableSeats === 0) return "Llena";
  return describeCount(session.availableSeats, "cupo", "cupos");
}

export function BrowseSessionsScreen({
  route,
}: {
  route: { params: ClientContext };
}) {
  const { clientId, clientName } = route.params;
  const navigation = useNavigation<BrowseNavigation>();
  const fetcher = useStaffFetcher();
  const today = boliviaCivilDate(new Date());
  const dates = useMemo(() => upcomingCivilDates(today, 7), [today]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [classTypeId, setClassTypeId] = useState(allClassTypes);
  const [choosingBranch, setChoosingBranch] = useState(false);

  const branches = useListBranches({ fetcher });
  const classTypes = useListClassTypes({ fetcher });
  const branchList = branches.data?.status === 200 ? branches.data.data : [];
  const branch =
    branchList.find((candidate) => candidate.id === selectedBranchId) ??
    branchList[0];
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
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Reservar una clase">Reservar una clase</Heading>
      <ClientBanner action="Reservando para" clientName={clientName} />
    </>
  );

  if (branches.isPending || classTypes.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando sucursales">Cargando…</BodyText>
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

  const classTypeList =
    classTypes.data?.status === 200 ? classTypes.data.data : [];
  const visible = (
    sessions.data?.status === 200 ? sessions.data.data : []
  ).filter(
    (session) =>
      classTypeId === allClassTypes || session.classTypeId === classTypeId,
  );

  return (
    <Screen style={styles.screen}>
      {header}
      <Pressable
        accessibilityLabel={`Sucursal: ${branch.name}`}
        accessibilityRole="button"
        onPress={() => setChoosingBranch((current) => !current)}
        style={styles.branchRow}
      >
        <BodyText style={styles.branchLabel}>Sucursal:</BodyText>
        <Text style={styles.branchName}>{branch.name}</Text>
        <Text style={styles.chevron}>{choosingBranch ? "▴" : "▾"}</Text>
      </Pressable>
      {choosingBranch ? (
        <View style={styles.branchList}>
          {branchList.map((candidate) => (
            <Chip
              key={candidate.id}
              label={candidate.name}
              onPress={() => {
                setSelectedBranchId(candidate.id);
                setChoosingBranch(false);
              }}
              selected={candidate.id === branch.id}
            />
          ))}
        </View>
      ) : null}
      <ScrollView
        horizontal
        contentContainerStyle={styles.chips}
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        testID="assistant-day-strip"
      >
        {dates.map((date) => {
          const { weekday, day } = dayChipLabel(date);
          const selected = date === selectedDate;
          return (
            <Pressable
              accessibilityLabel={`${weekday} ${day}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={date}
              onPress={() => setSelectedDate(date)}
              style={[styles.dayChip, selected && styles.chipSelected]}
            >
              <Text style={[styles.dayWeekday, selected && styles.chipLabelSelected]}>
                {weekday}
              </Text>
              <Text style={[styles.dayNumber, selected && styles.chipLabelSelected]}>
                {day}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView
        horizontal
        contentContainerStyle={styles.chips}
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        testID="assistant-class-type-strip"
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
      <Text style={styles.dayTitle}>
        {formatSessionDate(`${selectedDate}T12:00:00.000Z`)}
      </Text>
      {sessions.isPending ? (
        <BodyText accessibilityLabel="Cargando clases">Cargando…</BodyText>
      ) : sessions.isError ? (
        <QueryFailure
          label="No pudimos cargar las clases."
          onRetry={() => void sessions.refetch()}
        />
      ) : visible.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No hay clases con estos filtros.</Text>
          <BodyText style={styles.centered}>
            Prueba otro día, otra sucursal u otro tipo de clase.
          </BodyText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <TabletGrid testID="assistant-session-grid">
          {visible.map((session) => {
            const full = session.availableSeats === 0;
            return (
              <Pressable
                accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}`}
                accessibilityRole="button"
                key={session.id}
                onPress={() =>
                  navigation.navigate("SessionDetail", {
                    clientId,
                    clientName,
                    sessionId: session.id,
                  })
                }
                style={styles.card}
              >
                <View style={styles.cardBody}>
                  <Text style={styles.time}>
                    {formatTimeRange(session.startsAt, session.endsAt)}
                  </Text>
                  <Text style={styles.cardTitle}>{session.classTypeName}</Text>
                  <Text style={styles.trainer}>{session.trainerName}</Text>
                </View>
                <View style={[styles.tag, full && styles.tagFull]}>
                  <Text style={[styles.tagLabel, full && styles.tagLabelFull]}>
                    {seatsTag(session)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          </TabletGrid>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  branchLabel: { color: colors.textMuted },
  branchList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  branchName: { color: colors.text, fontSize: typography.body, fontWeight: "500" },
  branchRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  card: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardBody: { flex: 1, gap: spacing.xxs },
  cardTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  centered: { textAlign: "center" },
  chevron: { color: colors.textSubtle, fontSize: typography.body },
  chip: {
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipLabel: { color: colors.textSecondary, fontSize: typography.note },
  chipLabelSelected: { color: colors.white },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  dayChip: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.card,
    borderWidth: 1,
    minWidth: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dayNumber: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "600" },
  dayTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  dayWeekday: { color: colors.textMuted, fontSize: typography.label, textTransform: "uppercase" },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
    textAlign: "center",
  },
  list: { paddingBottom: spacing.xxl },
  screen: { gap: spacing.md },
  // Horizontal strips would otherwise stretch into spare tablet height.
  strip: { flexGrow: 0 },
  tag: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagFull: { backgroundColor: colors.disabledBackground },
  tagLabel: { color: colors.primaryOnTint, fontSize: typography.note, fontWeight: "500" },
  tagLabelFull: { color: colors.textSecondary },
  time: { color: colors.primaryDeep, fontWeight: "600" },
  trainer: { color: colors.textSecondary, fontSize: typography.body, fontWeight: "500" },
});
