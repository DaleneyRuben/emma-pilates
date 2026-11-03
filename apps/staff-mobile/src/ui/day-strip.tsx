import { agendaDayChipLabel, colors, fontFamilies, radii, spacing } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * The v2 week strip (S02, S07, S13, Horario): seven days share the width, so a
 * chip never clips (walkthrough 18). Today reads «Hoy»; the chosen day is Palo
 * de rosa. `trailing` is an extra chip such as S13's «Otra».
 */
export function DayStrip({
  dates,
  onSelect,
  selected,
  testIDPrefix,
  today,
  trailing,
}: {
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
        return (
          <Pressable
            accessibilityLabel={`${date === today ? "Hoy" : weekday} ${day}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={date}
            onPress={() => onSelect(date)}
            style={[styles.chip, isSelected && styles.selected]}
            testID={`${testIDPrefix}-${date}`}
          >
            <Text style={[styles.weekday, isSelected && styles.onSelected]}>{label}</Text>
            <Text style={[styles.day, isSelected && styles.onSelected]}>{day}</Text>
          </Pressable>
        );
      })}
      {trailing}
    </View>
  );
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
      style={[styles.chip, styles.action, selected && styles.selected]}
      testID={testID}
    >
      <Text style={[styles.actionLabel, selected && styles.onSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: { backgroundColor: colors.primaryTint },
  actionLabel: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 12,
    fontWeight: "600",
  },
  chip: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    flex: 1,
    gap: spacing.xxs,
    height: 60,
    justifyContent: "center",
    minWidth: 0,
  },
  day: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 18 },
  onSelected: { color: colors.white },
  selected: { backgroundColor: colors.primary, borderRadius: radii.button },
  strip: { flexDirection: "row", flexGrow: 0, flexShrink: 0, gap: spacing.smd },
  weekday: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
  },
});
