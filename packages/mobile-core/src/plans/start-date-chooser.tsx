import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { dayChipLabel } from "../time/session-format";
import { colors, radii, spacing, typography } from "../ui/tokens";
import { startDateOptions, type StartDateOption } from "./start-date-options";

export function StartDateChooser({
  today,
  startDateLimitDays,
  openingDate,
  selected,
  onSelect,
}: {
  today?: string;
  startDateLimitDays: number;
  openingDate: string | null;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const options = startDateOptions({ today, startDateLimitDays, openingDate });

  return (
    <View style={styles.block}>
      <Text style={styles.label}>Fecha de inicio</Text>
      <ScrollView
        contentContainerStyle={styles.row}
        horizontal
        showsHorizontalScrollIndicator={false}
        testID="start-date-chooser"
      >
        {options.map((option) => (
          <StartDateChip
            key={option.date}
            option={option}
            selected={option.date === selected}
            onSelect={onSelect}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function StartDateChip({
  option,
  selected,
  onSelect,
}: {
  option: StartDateOption;
  selected: boolean;
  onSelect: (date: string) => void;
}) {
  const chip = dayChipLabel(option.date);
  const weekday = option.weekday === "" ? chip.weekday : option.weekday;
  const day = option.weekday === "Día de apertura" ? "" : chip.day;

  return (
    <Pressable
      accessibilityLabel={day === "" ? weekday : `${weekday} ${day}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onSelect(option.date)}
      style={[styles.chip, selected && styles.chipSelected]}
      testID={`start-date-${option.date}`}
    >
      <Text style={[styles.weekday, selected && styles.selectedText]}>{weekday}</Text>
      {day === "" ? null : <Text style={[styles.day, selected && styles.selectedText]}>{day}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  label: { color: colors.textMuted, fontSize: typography.label },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderWidth: 1,
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  weekday: { color: colors.textMuted, fontSize: typography.label },
  day: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  selectedText: { color: colors.white },
});
