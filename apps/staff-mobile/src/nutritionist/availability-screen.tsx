import {
  type AvailabilityBlockDto,
  getListAvailabilityBlocksQueryKey,
  useListAvailabilityBlocks,
} from "@pilates/api-contracts";
import {
  Chevron,
  colors,
  fontFamilies,
  IconRowGroup,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  spacing,
  StateScreen,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";
import { SectionHeader } from "../ui/section-header";
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
  const queryKeys = [getListAvailabilityBlocksQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const header = (
    <RootHeader
      note="Las clientas eligen cupos de 45 min dentro de estos rangos."
      title="Mi disponibilidad"
    />
  );
  const newBlock = (
    <View style={styles.footer}>
      <PrimaryButton
        label="Nuevo horario"
        onPress={() => navigation.navigate("AvailabilityBlockForm")}
        testID="availability-new-block"
      />
    </View>
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

  if (sorted.length === 0) {
    return (
      <Screen style={styles.screen}>
        <RootHeader title="Mi disponibilidad" />
        <StateScreen
          icon="calendar"
          note="Publica un rango y las clientas podrán reservar su evaluación."
          primaryAction={{
            label: "Nuevo horario",
            onPress: () => navigation.navigate("AvailabilityBlockForm"),
            testID: "availability-new-block",
          }}
          title="Aún no publicaste horarios"
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.list} refreshControl={refreshControl}>
        {header}
        <View>
          <SectionHeader
            meta={countLabel(sorted.length, "horario", "horarios")}
            title="Horarios semanales"
          />
          <IconRowGroup>
            {sorted.map((block) => {
              const dates = dateLine(block, today);
              return (
                <Pressable
                  accessibilityLabel={`Editar horario ${blockRange(block)}`}
                  accessibilityRole="button"
                  key={block.id}
                  onPress={() => navigation.navigate("AvailabilityBlockForm", { block })}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{weekdayTag(block.weekday)}</Text>
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.range}>
                      {`${displayTime(block.startsAtLocal)} – ${displayTime(block.endsAtLocal)}`}
                    </Text>
                    <Text style={styles.muted}>
                      {[
                        `${block.slotsPerWeek} cupos · ${bookedLabel(block.upcomingBookedCount)}`,
                        ...(severalBranches ? [`Sucursal ${block.branchName}`] : []),
                      ].join(" · ")}
                    </Text>
                    {dates === null ? null : <Text style={styles.dates}>{dates}</Text>}
                  </View>
                  <Chevron size={16} strokeWidth={1.5} tone="muted" />
                </Pressable>
              );
            })}
          </IconRowGroup>
        </View>
      </ScrollView>
      {newBlock}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  dates: { color: colors.primaryOnTint, fontFamily: fontFamilies.body, fontSize: typography.note },
  footer: { paddingBottom: spacing.lg, paddingTop: spacing.md },
  list: { gap: spacing.xl, paddingBottom: spacing.xl },
  muted: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  pressed: { opacity: 0.7 },
  range: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 16 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  screen: { paddingHorizontal: spacing.xlSm },
  tag: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  tagText: { color: colors.primaryOnTint, fontFamily: fontFamilies.bodyStrong, fontSize: 12 },
});
