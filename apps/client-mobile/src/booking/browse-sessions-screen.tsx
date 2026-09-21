import {
  useListBranches,
  useListClassTypes,
  useListSessionAvailability,
  type SessionAvailabilityDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  Heading,
  QueryFailure,
  radii,
  Screen,
  shadows,
  spacing,
  typography,
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
  upcomingCivilDates,
} from "./session-format";

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
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SessionCard({
  session,
  onPress,
}: {
  session: SessionAvailabilityDto;
  onPress: () => void;
}) {
  const full = session.availableSeats === 0;
  return (
    <Pressable
      accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.cardBody}>
        <Text style={styles.time}>
          {formatTimeRange(session.startsAt, session.endsAt)}
        </Text>
        <Text style={styles.cardTitle}>{session.classTypeName}</Text>
        <BodyText>{session.trainerName}</BodyText>
      </View>
      <View style={[styles.tag, full && styles.tagFull]}>
        <Text style={[styles.tagLabel, full && styles.tagLabelFull]}>
          {seatsTag(session.availableSeats)}
        </Text>
      </View>
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
    selectedBranchId ??
    (branches.data?.status === 200 ? branches.data.data[0]?.id : undefined);
  const { from, until } = civilDateRange(selectedDate);
  const sessions = useListSessionAvailability(
    { branchId: branchId ?? "", from, until, limit: 100 },
    {
      fetcher,
      query: { enabled: branchId !== undefined, refetchOnMount: "always" },
    },
  );

  const branchList = branches.data?.status === 200 ? branches.data.data : [];
  const classTypeList =
    classTypes.data?.status === 200 ? classTypes.data.data : [];
  const selectedBranch = branchList.find((branch) => branch.id === branchId);
  const now = Date.now();
  const visibleSessions =
    sessions.data?.status === 200
      ? sessions.data.data.filter(
          (session) =>
            new Date(session.startsAt).getTime() > now &&
            (classTypeId === allClassTypes ||
              session.classTypeId === classTypeId),
        )
      : [];

  const failed =
    branches.isError ||
    (branches.data !== undefined && branches.data.status !== 200) ||
    sessions.isError ||
    (sessions.data !== undefined && sessions.data.status !== 200);
  const loading =
    branches.isPending || (branchId !== undefined && sessions.isPending);

  return (
    <Screen style={styles.screen}>
      <Heading accessibilityLabel="Reservar">Reservar una clase</Heading>
      {selectedBranch ? (
        <Pressable
          accessibilityLabel={`Sucursal: ${selectedBranch.name}`}
          accessibilityRole="button"
          onPress={() => setChoosingBranch((open) => !open)}
          style={styles.branchChip}
        >
          <Text style={styles.branchChipLabel}>
            {`Sucursal: ${selectedBranch.name}`}
          </Text>
        </Pressable>
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
              <Text style={styles.branchName}>{branch.name}</Text>
              <BodyText style={styles.branchAddress}>{branch.address}</BodyText>
            </Pressable>
          ))}
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.chipRow}
        horizontal
        showsHorizontalScrollIndicator={false}
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
        <BodyText accessibilityLabel="Cargando clases">Cargando…</BodyText>
      ) : failed ? (
        <QueryFailure
          label="No pudimos cargar las clases."
          onRetry={() => {
            void branches.refetch();
            void sessions.refetch();
          }}
        />
      ) : visibleSessions.length === 0 ? (
        <View style={styles.empty}>
          <BodyText>
            {classTypeId === allClassTypes
              ? "No hay clases este día."
              : "No hay clases con este filtro"}
          </BodyText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {visibleSessions.map((session) => (
            <SessionCard
              key={session.id}
              onPress={() =>
                navigation.navigate("SessionDetail", { sessionId: session.id })
              }
              session={session}
            />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  branchAddress: { fontSize: typography.note },
  branchChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  branchChipLabel: { color: colors.text, fontSize: typography.body },
  branchName: { color: colors.text, fontSize: typography.body },
  branchRow: { gap: spacing.xxs, paddingVertical: spacing.sm },
  branchSheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardBody: { flex: 1, gap: spacing.xxs },
  cardTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
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
  dayChip: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.card,
    borderWidth: 1,
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dayNumber: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  dayWeekday: { color: colors.textMuted, fontSize: typography.label },
  empty: { paddingVertical: spacing.xl },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  screen: { gap: spacing.md },
  sheetTitle: { color: colors.textMuted, fontSize: typography.label },
  tag: {
    backgroundColor: "rgba(216,189,184,0.28)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.smLg,
    paddingVertical: spacing.xs,
  },
  tagFull: { backgroundColor: "rgba(74,74,74,0.07)" },
  tagLabel: { color: colors.primaryDeep, fontSize: typography.label, fontWeight: "600" },
  tagLabelFull: { color: colors.textSecondary },
  time: { color: colors.primaryDeep, fontSize: typography.body, fontWeight: "600" },
});
