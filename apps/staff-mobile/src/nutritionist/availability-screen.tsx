import { useListAvailabilityBlocks, type AvailabilityBlockDto } from "@pilates/api-contracts";
import {
  BodyText,
  Chevron,
  colors,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import {
  addCivilDays,
  boliviaToday,
  civilDateLong,
  countLabel,
  displayTime,
  weekdayName,
  weekdayTag,
} from "./nutritionist-format";

type AvailabilityNavigation = {
  goBack: () => void;
  navigate: (screen: "AvailabilityBlockForm", params?: { block: AvailabilityBlockDto }) => void;
};

const blockRange = (block: AvailabilityBlockDto): string =>
  `${weekdayName(block.weekday)}, ${displayTime(block.startsAtLocal)} – ${displayTime(block.endsAtLocal)}`;

const bookedLabel = (count: number): string => {
  if (count === 0) return "sin reservas";
  return count === 1 ? "1 reservado" : `${count} reservados`;
};

// A block only carries a date line when it starts later or has an end.
const dateLine = (block: AvailabilityBlockDto, today: string): string | null => {
  const from = block.effectiveFrom > today ? civilDateLong(block.effectiveFrom) : null;
  // effectiveUntil is exclusive, so the last day is the one before it.
  const until =
    block.effectiveUntil === null ? null : civilDateLong(addCivilDays(block.effectiveUntil, -1));
  if (from !== null && until !== null) return `Desde el ${from} · hasta el ${until}`;
  if (from !== null) return `Desde el ${from}`;
  if (until !== null) return `Hasta el ${until}`;
  return null;
};

export function AvailabilityScreen() {
  const navigation = useNavigation<AvailabilityNavigation>();
  const fetcher = useStaffFetcher();
  const blocks = useListAvailabilityBlocks({
    fetcher,
    query: { refetchOnMount: "always" },
  });

  const header = (
    <ScreenTopBar
      action={
        <Pressable
          accessibilityLabel="Nuevo horario"
          accessibilityRole="button"
          onPress={() => navigation.navigate("AvailabilityBlockForm")}
          style={styles.newButton}
        >
          <Text style={styles.newButtonText}>+ Nuevo horario</Text>
        </Pressable>
      }
      fullBleed
      onBack={() => navigation.goBack()}
      title="Mi disponibilidad"
    />
  );

  if (blocks.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando horarios" />
      </Screen>
    );
  }

  if (blocks.isError || blocks.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar tus horarios."
          onRetry={() => void blocks.refetch()}
        />
      </Screen>
    );
  }

  const today = boliviaToday();
  const sorted = [...blocks.data.data].sort(
    (left, right) =>
      left.weekday - right.weekday ||
      left.startsAtLocal.localeCompare(right.startsAtLocal) ||
      left.effectiveFrom.localeCompare(right.effectiveFrom),
  );
  const severalBranches = new Set(sorted.map((block) => block.branchId)).size > 1;

  return (
    <Screen style={styles.screen}>
      {header}
      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aún no publicaste horarios de disponibilidad.</Text>
          <BodyText>Publica un rango y las clientas podrán reservar su evaluación.</BodyText>
          <PrimaryButton
            label="Nuevo horario"
            onPress={() => navigation.navigate("AvailabilityBlockForm")}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Horarios semanales</Text>
            <BodyText style={styles.muted}>
              {countLabel(sorted.length, "horario", "horarios")}
            </BodyText>
          </View>
          {sorted.map((block) => {
            const dates = dateLine(block, today);
            return (
              <Pressable
                accessibilityLabel={`Editar horario ${blockRange(block)}`}
                accessibilityRole="button"
                key={block.id}
                onPress={() => navigation.navigate("AvailabilityBlockForm", { block })}
                style={styles.card}
              >
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{weekdayTag(block.weekday)}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.range}>{blockRange(block)}</Text>
                  <BodyText style={styles.muted}>
                    {[
                      `${block.slotsPerWeek} cupos de 45 min · ${bookedLabel(block.upcomingBookedCount)}`,
                      ...(severalBranches ? [`Sucursal ${block.branchName}`] : []),
                    ].join(" · ")}
                  </BodyText>
                  {dates === null ? null : <BodyText style={styles.dates}>{dates}</BodyText>}
                </View>
                <Chevron />
              </Pressable>
            );
          })}
          <BodyText style={styles.muted}>
            Las clientas eligen cupos de 45 min dentro de estos rangos.
          </BodyText>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardBody: { flex: 1, gap: spacing.xxs },
  dates: { color: colors.primaryDeep, fontSize: typography.note },
  empty: { gap: spacing.lg, paddingTop: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  label: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  muted: { color: colors.textMuted, fontSize: typography.note },
  newButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  newButtonText: { color: colors.white, fontSize: typography.note, fontWeight: "600" },
  range: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  screen: { gap: spacing.lg },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between" },
  tag: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.control,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  tagText: { color: colors.primaryOnTint, fontSize: typography.note, fontWeight: "600" },
});
