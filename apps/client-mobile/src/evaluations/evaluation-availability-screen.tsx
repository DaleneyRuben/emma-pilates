import {
  getListEvaluationsQueryKey,
  useGetCurrentClientSubscription,
  useListEvaluationSlots,
  type ClientEvaluationDto,
  type EvaluationAvailabilityDto,
  type EvaluationSlotDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  dayChipLabel,
  initials,
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
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { moveEvaluation, rescheduleFailure } from "./reschedule-evaluation";
import { clockTime, evaluationDate } from "./evaluation-format";
import { UsedMonth, usedMonthStyles } from "./evaluation-used-month";
import { RescheduleConfirmSheet } from "./reschedule-confirm-sheet";

type AvailabilityNavigation = {
  goBack: () => void;
  navigate: {
    (screen: "Plans"): void;
    (screen: "BookEvaluation", params: { slot: EvaluationSlotDto }): void;
    (screen: "MyEvaluations", params: { confirmed: ClientEvaluationDto; moved: true }): void;
  };
};

type OpenDay = { date: string; slots: EvaluationSlotDto[] };

const openDays = (availability: EvaluationAvailabilityDto, currentSlotId?: string): OpenDay[] =>
  availability.days
    .map((day) => ({
      date: day.date,
      slots: day.slots.filter((slot) => slot.bookable && slot.id !== currentSlotId),
    }))
    .filter((day) => day.slots.length > 0);

function Intro({ rescheduling }: { rescheduling: boolean }) {
  return (
    <BodyText>
      {rescheduling
        ? "Tu evaluación ya está pagada. Elige el nuevo horario: el pago se mantiene."
        : "Reserva tu evaluación gratuita con la nutricionista. Tienes una evaluación disponible por mes."}
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

export function EvaluationAvailabilityScreen({
  route,
}: {
  route?: { params?: { evaluationId?: string; slotId?: string; startsAt?: string } };
}) {
  const navigation = useNavigation<AvailabilityNavigation>();
  const evaluationId = route?.params?.evaluationId;
  const currentSlotId = route?.params?.slotId;
  const rescheduling = evaluationId !== undefined;
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef(randomUUID());
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const subscription = useGetCurrentClientSubscription(queryOptions);
  const slots = useListEvaluationSlots(undefined, queryOptions);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [target, setTarget] = useState<EvaluationSlotDto | null>(null);

  const move = async (slot: EvaluationSlotDto) => {
    if (evaluationId === undefined || moving) return;
    setMoving(true);
    setFailure(null);
    try {
      const response = await moveEvaluation(evaluationId, slot, idempotencyKey.current, fetcher);
      if (response.status === 200) {
        await queryClient.invalidateQueries({
          queryKey: getListEvaluationsQueryKey({ scope: "upcoming" }),
        });
        setTarget(null);
        navigation.navigate("MyEvaluations", { confirmed: response.data, moved: true });
        return;
      }
      setTarget(null);
      setFailure(rescheduleFailure(response.data));
    } catch {
      setTarget(null);
      setFailure("No pudimos reprogramar la evaluación. Inténtalo de nuevo.");
    } finally {
      setMoving(false);
    }
  };

  const availability = slots.data?.status === 200 ? slots.data.data : null;
  const days = useMemo(
    () => (availability === null ? [] : openDays(availability, currentSlotId)),
    [availability, currentSlotId],
  );

  const header = (
    <ScreenTopBar
      fullBleed
      onBack={() => navigation.goBack()}
      title={rescheduling ? "Elige otro turno" : "Evaluación nutricional"}
    />
  );

  if (subscription.isPending || slots.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando disponibilidad" />
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

  const status = subscription.data?.status === 200 ? subscription.data.data.status : "none";
  if (status !== "active" && status !== "expiring_soon") {
    return (
      <Screen style={styles.screen}>
        {header}
        <View style={usedMonthStyles.used}>
          <Text style={usedMonthStyles.usedTitle}>
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
            <Intro rescheduling={rescheduling} />
            <View style={usedMonthStyles.used}>
              <Text style={usedMonthStyles.usedTitle}>No hay horarios disponibles por ahora.</Text>
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
        <Intro rescheduling={rescheduling} />
        {nutritionists.size === 1 ? (
          <NutritionistCard name={openSlots[0]?.nutritionistName ?? ""} />
        ) : null}
        <Text style={usedMonthStyles.label}>Días disponibles</Text>
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
                {selected.slots.length === 1 ? "1 horario" : `${selected.slots.length} horarios`}
              </BodyText>
            </View>
            <View style={styles.grid}>
              {selected.slots.map((slot) => (
                <Pressable
                  accessibilityLabel={`Turno ${slotLabel(slot)}`}
                  accessibilityRole="button"
                  key={slot.id}
                  onPress={() =>
                    rescheduling ? setTarget(slot) : navigation.navigate("BookEvaluation", { slot })
                  }
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
        {failure === null ? null : <BodyText accessibilityRole="alert">{failure}</BodyText>}
        <BodyText style={styles.muted}>
          {rescheduling
            ? "Al elegir un horario te pediremos confirmar el cambio."
            : "Al elegir un horario confirmarás la cita en la siguiente pantalla."}
        </BodyText>
        <BodyText style={styles.muted}>
          {rescheduling
            ? "Puedes reprogramarla hasta 3 horas antes."
            : "Puedes reservar hasta 3 horas antes."}
        </BodyText>
      </ScrollView>
      <RescheduleConfirmSheet
        busy={moving}
        currentStartsAt={route?.params?.startsAt}
        onConfirm={() => (target === null ? undefined : void move(target))}
        onDismiss={() => setTarget(null)}
        target={target}
      />
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
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.inset,
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
  muted: { color: colors.textMuted, fontSize: typography.note },
  nutritionist: {
    ...surfaces.flatCard,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
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
});
