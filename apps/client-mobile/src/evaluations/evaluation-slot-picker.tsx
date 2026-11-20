import type { EvaluationAvailabilityDto, EvaluationSlotDto } from "@pilates/api-contracts";
import {
  BodyText,
  chipStyles,
  colors,
  dayChipLabel,
  formatBolivianos,
  fontFamilies,
  PersonAvatar,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useState, type ReactNode } from "react";
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

/** C13's Nutritionist on her own white card, when one sees every open slot. */
export function SoleNutritionist({ days }: { days: OpenDay[] }) {
  const openSlots = days.flatMap((day) => day.slots);
  const names = new Set(openSlots.map((slot) => slot.nutritionistName));
  if (names.size !== 1) return null;
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
        <Text style={styles.nutritionistName}>{name}</Text>
        <BodyText style={styles.muted}>{`Nutricionista · 45 min · ${branchName}`}</BodyText>
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
              style={[styles.day, chipStyles.box, isSelected && chipStyles.boxSelected]}
            >
              <Text style={[styles.dayWeekday, isSelected && chipStyles.labelSelected]}>
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
            <BodyText style={styles.count}>
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
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  plain: { gap: spacing.smLg },
  count: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.note,
    fontWeight: "700",
  },
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
  dayNumber: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 20 },
  daySelectedText: { color: colors.onPrimary },
  dayStrip: { flexGrow: 0, flexShrink: 0 },
  dayTitle: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 11 * 0.14,
    textTransform: "uppercase",
  },
  dayWeekday: {
    color: colors.text,
    fontSize: typography.label,
    fontFamily: fontFamilies.bodyBold,
    fontWeight: "700",
  },
  days: { gap: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  muted: { color: colors.text, fontSize: typography.note, fontFamily: fontFamilies.body },
  nutritionist: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  nutritionistName: {
    color: colors.text,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
    fontFamily: fontFamilies.bodyStrong,
  },
  nutritionistText: { flex: 1, gap: spacing.xxs },
  // C13's slots: 56 high, soft 50 with a 1.5 400 outline, the time in Lora 22.
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
  slotCaption: {
    color: colors.text,
    fontSize: typography.label,
    fontFamily: fontFamilies.body,
  },
  slotTime: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.titleSecondary,
    fontVariant: ["tabular-nums"],
  },
});
