import {
  useListBranches,
  useListClassTypes,
  useListAdministratorSessions,
  useListSessionAvailability,
  type SessionAvailabilityDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  BranchPickerPill,
  CardFooter,
  Chevron,
  boliviaCivilDate,
  civilDateRange,
  colors,
  dayChipLabel,
  DetailLine,
  fontFamilies,
  formatSessionDate,
  formatTimeRange,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
  upcomingCivilDates,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { describeCount } from "./administrator-format";

export type CancellableSession = SessionAvailabilityDto & { branchName: string };

type CancelClassNavigation = {
  goBack: () => void;
  navigate: (screen: "CancelSession", params: { session: CancellableSession }) => void;
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

const everyBranch = "every-branch";

export function CancelClassScreen() {
  const navigation = useNavigation<CancelClassNavigation>();
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
  const allBranches = selectedBranchId === everyBranch;
  const branch =
    branchList.find((candidate) => candidate.id === selectedBranchId) ??
    branchList[0];
  const { from, until } = civilDateRange(selectedDate);
  const branchSessions = useListSessionAvailability(
    { branchId: branch?.id ?? "", from, until, limit: 100 },
    {
      fetcher,
      query: {
        enabled: branch !== undefined && !allBranches,
        refetchOnMount: "always",
      },
    },
  );
  // API-002: an Administrator acts on every Branch, so one search spans them.
  const everySession = useListAdministratorSessions(
    { from, until, limit: 100 },
    { fetcher, query: { enabled: allBranches, refetchOnMount: "always" } },
  );
  const sessions = allBranches ? everySession : branchSessions;
  const branchLabel = allBranches ? "Todas las sucursales" : (branch?.name ?? "");

  const header = (
    <>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Cancelar una clase" />
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
  const dayTitle = formatSessionDate(`${selectedDate}T12:00:00.000Z`);

  return (
    <Screen style={styles.screen}>
      {header}
      <BranchPickerPill
        name={branchLabel}
        onPress={() => setChoosingBranch((current) => !current)}
        open={choosingBranch}
      />
      {choosingBranch ? (
        <View style={styles.branchList}>
          <BodyText>Elige una sucursal</BodyText>
          <Chip
            label="Todas las sucursales"
            onPress={() => {
              setSelectedBranchId(everyBranch);
              setChoosingBranch(false);
            }}
            selected={allBranches}
          />
          {branchList.map((candidate) => (
            <Chip
              key={candidate.id}
              label={candidate.name}
              onPress={() => {
                setSelectedBranchId(candidate.id);
                setChoosingBranch(false);
              }}
              selected={!allBranches && candidate.id === branch.id}
            />
          ))}
        </View>
      ) : null}
      <ScrollView
        horizontal
        contentContainerStyle={styles.chips}
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
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
      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>{dayTitle}</Text>
        <BodyText>{describeCount(visible.length, "clase", "clases")}</BodyText>
      </View>
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
          {visible.map((session) => {
            const full = session.availableSeats === 0;
            return (
              <Pressable
                accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}${allBranches ? ` · ${session.branchName}` : ""}`}
                accessibilityRole="button"
                key={session.id}
                onPress={() =>
                  navigation.navigate("CancelSession", {
                    session: {
                      ...session,
                      branchName: allBranches ? session.branchName : branch.name,
                    },
                  })
                }
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitles}>
                    <Text style={styles.time}>
                      {formatTimeRange(session.startsAt, session.endsAt)}
                    </Text>
                    <Text style={styles.cardTitle}>{session.classTypeName}</Text>
                  </View>
                  <Chevron />
                </View>
                <View style={styles.details}>
                  <DetailLine icon="person" iconSize={16} style={styles.trainer}>
                    {session.trainerName}
                  </DetailLine>
                  <DetailLine icon="pin" iconSize={15} style={styles.branch}>
                    {`Sucursal ${allBranches ? session.branchName : branch.name}`}
                  </DetailLine>
                </View>
                <CardFooter paddingTop={13}>
                  <Text style={styles.booked}>
                    {describeCount(session.bookedCount, "reserva", "reservas")}
                  </Text>
                  <View style={[styles.tag, full && styles.tagFull]}>
                    <Text style={[styles.tagLabel, full && styles.tagLabelFull]}>
                      {seatsTag(session)}
                    </Text>
                  </View>
                </CardFooter>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Horizontal strips keep their natural height when the list below is long.
  strip: { flexGrow: 0, flexShrink: 0 },
  booked: { color: colors.textSecondary, fontSize: 14, fontVariant: ["tabular-nums"] },
  branch: { color: colors.textMuted, fontSize: typography.note },
  // S13's card (MOB-042): the chevron beside the time and title, the Trainer
  // and Branch lines, then the booked count and the seat pill under a rule.
  card: { ...surfaces.card, gap: 13, padding: spacing.lgXl },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.titleCard,
  },
  cardTitles: { flexShrink: 1, gap: spacing.smd },
  details: { gap: 7 },
  time: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.note,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
    letterSpacing: 0.78,
  },
  trainer: { color: colors.text, fontSize: 14 },
  branchList: { gap: spacing.sm },
  centered: { textAlign: "center" },
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
    borderRadius: radii.inset,
    borderWidth: 1,
    minWidth: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dayHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayNumber: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "600" },
  dayTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  dayWeekday: {
    color: colors.textMuted,
    fontSize: typography.label,
    textTransform: "uppercase",
  },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
    textAlign: "center",
  },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  screen: { gap: spacing.md },
  tag: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagFull: { backgroundColor: colors.disabledBackground },
  tagLabel: { color: colors.primaryOnTint, fontSize: typography.note, fontWeight: "500" },
  tagLabelFull: { color: colors.textSecondary },
});
