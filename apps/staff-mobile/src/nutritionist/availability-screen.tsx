import {
  type AvailabilityBlockDto,
  getListAvailabilityBlocksQueryKey,
  useListAvailabilityBlocks,
  formatListDate,
} from "@pilates/api-contracts";
import {
  Chevron,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  spacing,
  StateScreen,
  Text,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { bodyScroll, RowCard, SoftNote } from "../ui/card-pieces";
import { TabFooter } from "../ui/tab-footer";
import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";
import {
  addCivilDays,
  boliviaToday,
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
  return count === 1 ? "1 con reserva" : `${count} con reserva`;
};

// A block only carries a date line when it starts later or has an end.
const dateLine = (block: AvailabilityBlockDto, today: string): string | null => {
  const from = block.effectiveFrom > today ? formatListDate(block.effectiveFrom) : null;
  // effectiveUntil is exclusive, so the last day is the one before it.
  const until =
    block.effectiveUntil === null ? null : formatListDate(addCivilDays(block.effectiveUntil, -1));
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

  // Boards N05–N06: the band holds the title alone; the note rides a soft
  // aside on the body, and «Nuevo horario» the white footer above the tabs.
  const header = <RootHeader title="Mi disponibilidad" />;
  const note = (
    <SoftNote icon="clock" message="Las clientas eligen turnos de 45 min dentro de estos rangos." />
  );
  const newBlock = (
    <TabFooter>
      <PrimaryButton
        label="Nuevo horario"
        onPress={() => navigation.navigate("AvailabilityBlockForm")}
        testID="availability-new-block"
      />
    </TabFooter>
  );

  if (blocks.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <View style={styles.state}>{note}</View>
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
        {header}
        <View style={styles.balance} />
        <StateScreen
          icon="calendar"
          layout="card"
          note="Publica un rango y las clientas podrán reservar su evaluación."
          primaryAction={{
            label: "Nuevo horario",
            onPress: () => navigation.navigate("AvailabilityBlockForm"),
            testID: "availability-new-block",
          }}
          title="Aún no publicaste horarios"
        />
        <View style={styles.balance} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={bodyScroll.content}
        refreshControl={refreshControl}
        style={bodyScroll.scroll}
      >
        {note}
        <RowCard label={`Horarios semanales · ${countLabel(sorted.length, "horario", "horarios")}`}>
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
                  <Text variant="titulo-fila">{weekdayTag(block.weekday)}</Text>
                </View>
                <View style={styles.body}>
                  <Text variant="titulo-fila">
                    {`${displayTime(block.startsAtLocal)} – ${displayTime(block.endsAtLocal)}`}
                  </Text>
                  <Text variant="secundario">
                    {[
                      `${block.slotsPerWeek} turnos · ${bookedLabel(block.upcomingBookedCount)}`,
                      ...(severalBranches ? [`Sucursal ${block.branchName}`] : []),
                    ].join(" · ")}
                  </Text>
                  {dates === null ? null : <Text variant="secundario">{dates}</Text>}
                </View>
                <Chevron size={16} strokeWidth={1.5} tone="muted" />
              </Pressable>
            );
          })}
        </RowCard>
      </ScrollView>
      {newBlock}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Board N06: the empty card sits in the middle of the space under the band.
  balance: { flex: 1 },
  body: { flex: 1, gap: spacing.xxs },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  screen: { paddingHorizontal: spacing.xlSm },
  state: { paddingTop: spacing.md },
  // FIX-089: the weekday is a word in weight, with no tinted disc behind it.
  tag: { justifyContent: "center", width: 40 },
});
