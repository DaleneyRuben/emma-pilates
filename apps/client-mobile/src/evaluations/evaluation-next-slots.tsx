import type { EvaluationSlotDto } from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  colors,
  formatBolivianos,
  radii,
  spacing,
  Text,
  useMountedAt,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

import { firstName, slotDayLabel } from "./evaluation-appointment-format";
import { clockTime } from "./evaluation-format";
import type { OpenDay } from "./evaluation-slot-picker";

const priceLabel = (slot: EvaluationSlotDto) =>
  slot.included ? "Gratis" : formatBolivianos(slot.priceCentavos);

/** «Próximos horarios con Gabriela · Bs 100», leaving out what the slots do not share. */
export function nextSlotsLine(slots: EvaluationSlotDto[]): string {
  const names = new Set(slots.map((slot) => slot.nutritionistName));
  const prices = new Set(slots.map(priceLabel));
  const lead =
    names.size === 1
      ? `Próximos horarios con ${firstName(slots[0]?.nutritionistName ?? "")}`
      : "Próximos horarios";
  return prices.size === 1 ? `${lead} · ${[...prices][0]}` : lead;
}

/**
 * C5 pick C «horarios a un toque»: the next three open slots as soft 50 boxes
 * with a 400 outline (C13d), each opening Confirma tu cita. A
 * Branch, Nutritionist or price the three do not share goes under the time.
 */
export function NextSlots({
  days,
  onPick,
}: {
  days: OpenDay[];
  onPick: (slot: EvaluationSlotDto) => void;
}) {
  const today = boliviaCivilDate(new Date(useMountedAt()));
  const slots = days.flatMap((day) => day.slots).slice(0, 3);
  const differs = (pick: (slot: EvaluationSlotDto) => string) => new Set(slots.map(pick)).size > 1;
  const captions = (slot: EvaluationSlotDto) => [
    ...(differs((s) => s.branchId) ? [slot.branchName] : []),
    ...(differs((s) => s.nutritionistName) ? [firstName(slot.nutritionistName)] : []),
    ...(differs(priceLabel) ? [priceLabel(slot)] : []),
  ];

  return (
    <>
      <Text variant="secundario">{nextSlotsLine(slots)}</Text>
      <View style={styles.row}>
        {slots.map((slot) => {
          const dayLabel = slotDayLabel(slot.startsAt, today);
          const time = clockTime(slot.startsAt);
          const extra = captions(slot);
          return (
            <Pressable
              accessibilityLabel={[`Turno ${dayLabel} ${time}`, ...extra].join(" · ")}
              accessibilityRole="button"
              key={slot.id}
              onPress={() => onPick(slot)}
              style={({ pressed }) => [styles.box, pressed && styles.pressed]}
            >
              <Text variant="pastilla">{dayLabel}</Text>
              <Text variant="cifra">{time}</Text>
              {extra.map((caption) => (
                <Text key={caption} variant="pastilla">
                  {caption}
                </Text>
              ))}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderWidth: 1.5,
    flex: 1,
    gap: spacing.xxs,
    justifyContent: "center",
    minHeight: 62,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: "row", gap: spacing.sm },
});
