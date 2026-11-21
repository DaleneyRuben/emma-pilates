import { agendaDayChipLabel, chipStyles, shadows, spacing, Text } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

/**
 * The v2 week strip (S02, S07, S13, Horario): seven days share the width, so a
 * chip never clips (walkthrough 18). Today reads «Hoy»; the chosen day is Rosa
 * profundo with Crema words, the others Crema with an Arcilla outline (FIX-089).
 * `trailing` is an extra chip such as S13's «Otra». `counts` (E1 B) adds how
 * many classes each day holds under its number, «—» for none, blank while loading.
 * The weekday and the count are `pastilla`, the day number `cifra` (follow-up 285).
 */
export function DayStrip({
  counts,
  dates,
  onSelect,
  selected,
  testIDPrefix,
  today,
  trailing,
}: {
  counts?: Readonly<Record<string, number | undefined>>;
  dates: readonly string[];
  onSelect: (date: string) => void;
  selected: string;
  testIDPrefix: string;
  today: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.strip} testID={`${testIDPrefix}-strip`}>
      {dates.map((date) => {
        const { weekday, day } = agendaDayChipLabel(date);
        const isSelected = date === selected;
        const label = date === today ? "Hoy" : weekday.toLowerCase();
        const count = counts?.[date];
        const tone = isSelected ? "onDark" : "ink";
        return (
          <Pressable
            accessibilityLabel={`${date === today ? "Hoy" : weekday} ${day}${countTail(count)}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={date}
            onPress={() => onSelect(date)}
            style={[
              styles.chip,
              counts !== undefined && styles.countedChip,
              chipStyles.box,
              styles.tile,
              isSelected && chipStyles.boxSelected,
            ]}
            testID={`${testIDPrefix}-${date}`}
          >
            <Text tone={tone} variant="pastilla">
              {label}
            </Text>
            <Text tone={tone} variant="cifra">
              {day}
            </Text>
            {counts === undefined ? null : (
              <Text testID={`${testIDPrefix}-${date}-count`} tone={tone} variant="pastilla">
                {count === undefined ? " " : count === 0 ? "—" : String(count)}
              </Text>
            )}
          </Pressable>
        );
      })}
      {trailing}
    </View>
  );
}

function countTail(count: number | undefined): string {
  if (count === undefined) return "";
  if (count === 0) return ", sin clases";
  return count === 1 ? ", 1 clase" : `, ${count} clases`;
}

/** A chip the size of a day, for a strip's trailing action («Otra»). */
export function DayStripAction({
  accessibilityLabel,
  label,
  onPress,
  selected = false,
  testID,
}: {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
  selected?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, chipStyles.box, selected && chipStyles.boxSelected]}
      testID={testID}
    >
      <Text tone={selected ? "onDark" : "ink"} variant="pastilla">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    gap: spacing.xxs,
    justifyContent: "center",
    minHeight: 60,
    minWidth: 0,
  },
  countedChip: { gap: 0, minHeight: 70 },
  strip: { flexDirection: "row", flexGrow: 0, flexShrink: 0, gap: spacing.smd },
  // Rosa Emma: the days are white tiles lifted by the card shadow, no outline.
  tile: { ...shadows.card, borderWidth: 0 },
});
