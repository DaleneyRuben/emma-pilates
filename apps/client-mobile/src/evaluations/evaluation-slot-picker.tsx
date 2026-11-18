import type { EvaluationAvailabilityDto, EvaluationSlotDto } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  dayChipLabel,
  formatBolivianos,
  fontFamilies,
  initials,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { clockTime, evaluationDate } from "./evaluation-format";
import { usedMonthStyles } from "./evaluation-used-month";

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

function NutritionistCard({ branchName, name }: { branchName: string; name: string }) {
  return (
    <View style={styles.nutritionist}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(name)}</Text>
      </View>
      <View>
        <Text style={styles.nutritionistName}>{name}</Text>
        <BodyText style={styles.muted}>{`Nutricionista · 45 min · ${branchName}`}</BodyText>
      </View>
    </View>
  );
}

/** C13's Nutritionist, day chips and slot grid. */
export function EvaluationSlotPicker({
  days,
  onPick,
}: {
  days: OpenDay[];
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
    <>
      {nutritionists.size === 1 ? (
        <NutritionistCard
          branchName={openSlots[0]?.branchName ?? ""}
          name={openSlots[0]?.nutritionistName ?? ""}
        />
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
            <Text style={styles.dayTitle}>{evaluationDate(selected.slots[0]?.startsAt ?? "")}</Text>
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
                onPress={() => onPick(slot)}
                style={styles.slot}
              >
                <Text style={styles.slotTime}>{clockTime(slot.startsAt)}</Text>
                {branches.size > 1 ? (
                  <Text style={styles.slotCaption}>{slot.branchName}</Text>
                ) : null}
                {nutritionists.size > 1 ? (
                  <Text style={styles.slotCaption}>{slot.nutritionistName}</Text>
                ) : null}
                {mixedPrices ? <Text style={styles.slotCaption}>{priceLabel(slot)}</Text> : null}
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: { color: colors.primaryOnTint, fontFamily: fontFamilies.display, fontSize: 16 },
  // C13's day chips match Reservar's: 48 × 60 on Lino, the chosen one Palo de rosa.
  day: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.button,
    gap: spacing.xxs,
    height: 60,
    justifyContent: "center",
    width: 48,
  },
  dayHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayNumber: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 18 },
  daySelected: { backgroundColor: colors.primary },
  daySelectedText: { color: colors.white },
  dayStrip: { flexGrow: 0, flexShrink: 0 },
  dayTitle: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  dayWeekday: { color: colors.textMuted, fontSize: typography.tabLabel },
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
  slot: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.button,
    justifyContent: "center",
    minHeight: 52,
    paddingVertical: spacing.xs,
    width: "31%",
  },
  slotCaption: { color: colors.textMuted, fontSize: typography.label },
  slotTime: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
});
