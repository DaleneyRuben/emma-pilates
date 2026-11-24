import type { EvaluationAvailabilityDto, EvaluationSlotDto } from "@pilates/api-contracts";
import {
  chipStyles,
  colors,
  dayChipLabel,
  formatBolivianos,
  PersonAvatar,
  radii,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { clockTime, evaluationDate } from "./evaluation-format";

export type OpenDay = { date: string; slots: EvaluationSlotDto[] };

/** The days with a bookable slot, leaving out the slot she already holds. */
export const openDays = (
  availability: EvaluationAvailabilityDto,
  currentSlotId?: string,
): OpenDay[] =>
  availability.days
    .map((day) => ({
      date: day.date,
      slots: day.slots.filter((slot) => slot.bookable && slot.id !== currentSlotId),
    }))
    .filter((day) => day.slots.length > 0);

/** C13's Nutritionist on her own white card, when one sees every open slot. */
/** One Nutritionist holds every open slot, so her card names her. */
export function hasSoleNutritionist(days: OpenDay[]): boolean {
  const names = new Set(days.flatMap((day) => day.slots).map((slot) => slot.nutritionistName));
  return names.size === 1;
}

export function SoleNutritionist({ days }: { days: OpenDay[] }) {
  const openSlots = days.flatMap((day) => day.slots);
  if (!hasSoleNutritionist(days)) return null;
  return (
    <NutritionistCard
      branchName={openSlots[0]?.branchName ?? ""}
      name={openSlots[0]?.nutritionistName ?? ""}
    />
  );
}

function NutritionistCard({ branchName, name }: { branchName: string; name: string }) {
  return (
    <View style={styles.nutritionist}>
      <PersonAvatar name={name} photoUri={null} size={44} />
      <View style={styles.nutritionistText}>
        <Text variant="titulo-fila">{name}</Text>
        <Text variant="secundario">{`Nutricionista · 45 min · ${branchName}`}</Text>
      </View>
    </View>
  );
}

/**
 * C13's day chips and slot grid on one white card, with the section's note at
 * its foot. The Nutritionist's card (`SoleNutritionist`) goes above it.
 */
export function EvaluationSlotPicker({
  days,
  footer,
  onPick,
  plain = false,
}: {
  days: OpenDay[];
  /** The note under the slots, inside the card. */
  footer?: ReactNode;
  /** Already inside a white card («¿Otra evaluación?» opened): no card of its own. */
  plain?: boolean;
  onPick: (slot: EvaluationSlotDto) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selected = days.find((day) => day.date === selectedDate) ?? days[0];
  const openSlots = days.flatMap((day) => day.slots);
  const nutritionists = new Set(openSlots.map((slot) => slot.nutritionistName));
  const branches = new Set(openSlots.map((slot) => slot.branchId));
  // Walkthrough finding 100: with free and paid slots open, each says which.
  const mixedPrices =
    openSlots.some((slot) => slot.included) && openSlots.some((slot) => !slot.included);
  const priceLabel = (slot: EvaluationSlotDto) =>
    slot.included ? "Gratis" : formatBolivianos(slot.priceCentavos);
  const slotLabel = (slot: EvaluationSlotDto) =>
    [
      clockTime(slot.startsAt),
      ...(branches.size > 1 ? [slot.branchName] : []),
      ...(nutritionists.size > 1 ? [slot.nutritionistName] : []),
      ...(mixedPrices ? [priceLabel(slot)] : []),
    ].join(" · ");

  return (
    <View style={plain ? styles.plain : styles.card} testID="evaluation-slot-card">
      <Text variant="etiqueta">Días disponibles</Text>
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
              style={[styles.day, chipStyles.box, isSelected && chipStyles.boxSelected]}
            >
              <Text tone={isSelected ? "onDark" : "ink"} variant="pastilla">
                {chip.weekday}
              </Text>
              <Text tone={isSelected ? "onDark" : "ink"} variant="cifra">
                {chip.day}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {selected !== undefined ? (
        <>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle} variant="etiqueta">
              {evaluationDate(selected.slots[0]?.startsAt ?? "")}
            </Text>
            <Text variant="pastilla">
              {selected.slots.length === 1 ? "1 horario" : `${selected.slots.length} horarios`}
            </Text>
          </View>
          <View style={styles.grid}>
            {selected.slots.map((slot) => (
              <Pressable
                accessibilityLabel={`Turno ${slotLabel(slot)}`}
                accessibilityRole="button"
                key={slot.id}
                onPress={() => onPick(slot)}
                style={styles.slot}
              >
                <Text variant="cifra">{clockTime(slot.startsAt)}</Text>
                {branches.size > 1 ? <Text variant="pastilla">{slot.branchName}</Text> : null}
                {nutritionists.size > 1 ? (
                  <Text variant="pastilla">{slot.nutritionistName}</Text>
                ) : null}
                {mixedPrices ? <Text variant="pastilla">{priceLabel(slot)}</Text> : null}
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  plain: { gap: spacing.smLg },
  // C13's day chips: 48 × 60, white with a 400 outline, the chosen one 600.
  day: {
    alignItems: "center",
    borderRadius: radii.inset,
    gap: spacing.xxs,
    height: 60,
    justifyContent: "center",
    width: 48,
  },
  dayHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  dayStrip: { flexGrow: 0, flexShrink: 0 },
  dayTitle: { flexShrink: 1 },
  days: { gap: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  nutritionist: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  nutritionistText: { flex: 1, gap: spacing.xxs },
  // C13's slots: 56 high, soft 50 with a 1.5 400 outline, the time in `cifra`.
  slot: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 56,
    paddingVertical: spacing.xs,
    width: "31%",
  },
});
