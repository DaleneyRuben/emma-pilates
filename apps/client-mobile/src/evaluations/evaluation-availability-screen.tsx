import {
  useGetCurrentClientSubscription,
  useListEvaluationSlots,
  type EvaluationAvailabilityDto,
  type EvaluationSlotDto,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  dayChipLabel,
  Heading,
  initials,
  PrimaryButton,
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
  clockTime,
  evaluationDate,
  evaluationDayAndTime,
  followingMonth,
  monthName,
  monthPhrase,
} from "./evaluation-format";

type AvailabilityNavigation = {
  goBack: () => void;
  navigate: {
    (screen: "Plans"): void;
    (screen: "BookEvaluation", params: { slot: EvaluationSlotDto }): void;
  };
};

type OpenDay = { date: string; slots: EvaluationSlotDto[] };

const openDays = (availability: EvaluationAvailabilityDto): OpenDay[] =>
  availability.days
    .map((day) => ({
      date: day.date,
      slots: day.slots.filter((slot) => slot.bookable),
    }))
    .filter((day) => day.slots.length > 0);

// The month a Client can book next once the open picker is empty: the first
// unused month in the horizon, else the month after the last used one.
const nextUnusedMonth = (
  months: EvaluationAvailabilityDto["months"],
): string | null => {
  const lastUsed = [...months].reverse().find((month) => month.status === "used");
  if (lastUsed === undefined) return null;
  const available = months.find(
    (month) => month.status === "available" && month.month > lastUsed.month,
  );
  return available?.month ?? followingMonth(lastUsed.month);
};

function Intro() {
  return (
    <BodyText>
      Reserva tu evaluación gratuita con la nutricionista. Tienes una
      evaluación disponible por mes.
    </BodyText>
  );
}

function NutritionistCard({ name }: { name: string }) {
  return (
    <View style={styles.nutritionist}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(name)}</Text>
      </View>
      <View>
        <Text style={styles.nutritionistName}>{name}</Text>
        <BodyText style={styles.muted}>Nutricionista · sesiones de 45 min</BodyText>
      </View>
    </View>
  );
}

function UsedMonth({ availability }: { availability: EvaluationAvailabilityDto }) {
  const next = nextUnusedMonth(availability.months);
  const usedMonth = availability.months.find((month) => month.status === "used");
  const last = [...availability.months]
    .reverse()
    .find((month) => month.evaluation !== null)?.evaluation;

  return (
    <View style={styles.used}>
      <Text style={styles.usedTitle}>
        {`Ya usaste tu evaluación de ${usedMonth === undefined ? "este mes" : monthPhrase(usedMonth.month)}.`}
      </Text>
      {next !== null ? (
        <BodyText>
          {`Podrás agendar la de ${monthName(next)} desde el 1 de ${monthName(next)}.`}
        </BodyText>
      ) : null}
      {last ? (
        <View style={styles.lastCard}>
          <Text style={styles.label}>Tu última evaluación</Text>
          <BodyText>{evaluationDayAndTime(last.startsAt)}</BodyText>
        </View>
      ) : null}
    </View>
  );
}

export function EvaluationAvailabilityScreen() {
  const navigation = useNavigation<AvailabilityNavigation>();
  const fetcher = useClientFetcher();
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const subscription = useGetCurrentClientSubscription(queryOptions);
  const slots = useListEvaluationSlots(undefined, queryOptions);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const availability = slots.data?.status === 200 ? slots.data.data : null;
  const days = useMemo(
    () => (availability === null ? [] : openDays(availability)),
    [availability],
  );

  const header = (
    <>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Evaluación nutricional">
        Evaluación nutricional
      </Heading>
    </>
  );

  if (subscription.isPending || slots.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando disponibilidad">Cargando…</BodyText>
      </Screen>
    );
  }

  if (slots.isError || availability === null) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar los horarios de evaluación."
          onRetry={() => void slots.refetch()}
        />
      </Screen>
    );
  }

  const status =
    subscription.data?.status === 200 ? subscription.data.data.status : "none";
  if (status !== "active" && status !== "expiring_soon") {
    return (
      <Screen style={styles.screen}>
        {header}
        <View style={styles.used}>
          <Text style={styles.usedTitle}>
            Necesitas un plan activo para reservar tu evaluación.
          </Text>
          <BodyText>La evaluación es gratuita con cualquier plan.</BodyText>
        </View>
        <PrimaryButton label="Ver planes" onPress={() => navigation.navigate("Plans")} />
      </Screen>
    );
  }

  if (days.length === 0) {
    const anyUsed = availability.months.some((month) => month.status === "used");
    return (
      <Screen style={styles.screen}>
        {header}
        {anyUsed ? (
          <UsedMonth availability={availability} />
        ) : (
          <>
            <Intro />
            <View style={styles.used}>
              <Text style={styles.usedTitle}>No hay horarios disponibles por ahora.</Text>
              <BodyText>Vuelve a revisar en unos días.</BodyText>
            </View>
          </>
        )}
      </Screen>
    );
  }

  const selected = days.find((day) => day.date === selectedDate) ?? days[0];
  const openSlots = days.flatMap((day) => day.slots);
  const nutritionists = new Set(openSlots.map((slot) => slot.nutritionistName));
  const branches = new Set(openSlots.map((slot) => slot.branchId));
  const slotLabel = (slot: EvaluationSlotDto) =>
    [
      clockTime(slot.startsAt),
      ...(branches.size > 1 ? [slot.branchName] : []),
      ...(nutritionists.size > 1 ? [slot.nutritionistName] : []),
    ].join(" · ");

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <Intro />
        {nutritionists.size === 1 ? (
          <NutritionistCard name={openSlots[0]?.nutritionistName ?? ""} />
        ) : null}
        <Text style={styles.label}>Días disponibles</Text>
        <ScrollView
          contentContainerStyle={styles.days}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dayStrip}
        >
          {days.map((day) => {
            const chip = dayChipLabel(day.date);
            const isSelected = day.date === selected?.date;
            return (
              <Pressable
                accessibilityLabel={`${chip.weekday} ${chip.day}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={day.date}
                onPress={() => setSelectedDate(day.date)}
                style={[styles.day, isSelected && styles.daySelected]}
              >
                <Text style={[styles.dayWeekday, isSelected && styles.daySelectedText]}>
                  {chip.weekday}
                </Text>
                <Text style={[styles.dayNumber, isSelected && styles.daySelectedText]}>
                  {chip.day}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {selected !== undefined ? (
          <>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>
                {evaluationDate(selected.slots[0]?.startsAt ?? "")}
              </Text>
              <BodyText style={styles.muted}>
                {selected.slots.length === 1
                  ? "1 horario"
                  : `${selected.slots.length} horarios`}
              </BodyText>
            </View>
            <View style={styles.grid}>
              {selected.slots.map((slot) => (
                <Pressable
                  accessibilityLabel={`Turno ${slotLabel(slot)}`}
                  accessibilityRole="button"
                  key={slot.id}
                  onPress={() => navigation.navigate("BookEvaluation", { slot })}
                  style={styles.slot}
                >
                  <Text style={styles.slotTime}>{clockTime(slot.startsAt)}</Text>
                  {branches.size > 1 ? (
                    <Text style={styles.slotCaption}>{slot.branchName}</Text>
                  ) : null}
                  {nutritionists.size > 1 ? (
                    <Text style={styles.slotCaption}>{slot.nutritionistName}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <BodyText style={styles.muted}>
          Los horarios ocupados no se muestran. Al elegir uno confirmarás la cita
          en la siguiente pantalla.
        </BodyText>
        <BodyText style={styles.muted}>Puedes reservar hasta 3 horas antes.</BodyText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarText: { color: colors.primaryOnTint, fontSize: typography.body, fontWeight: "600" },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  day: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.xxs,
    minWidth: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dayHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayNumber: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "600" },
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  daySelectedText: { color: colors.white },
  dayStrip: { flexGrow: 0 },
  dayTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  dayWeekday: { color: colors.textSecondary, fontSize: typography.label },
  days: { gap: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  label: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  lastCard: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  muted: { color: colors.textMuted, fontSize: typography.note },
  nutritionist: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  nutritionistName: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  screen: { gap: spacing.lg },
  slot: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingVertical: spacing.xs,
    width: "31%",
  },
  slotCaption: { color: colors.textMuted, fontSize: typography.label },
  slotTime: { color: colors.text, fontSize: typography.body, fontWeight: "500" },
  used: {
    backgroundColor: "rgba(201,154,78,0.10)",
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  usedTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
});
