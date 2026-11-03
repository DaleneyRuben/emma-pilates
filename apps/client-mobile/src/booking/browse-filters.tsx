import {
  BranchPickerPill,
  colors,
  dayChipLabel,
  fontFamilies,
  Glyph,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

/**
 * Walkthrough n.º 7: with one Branch, the Branch is fixed (no chevron, not
 * tappable); the picker pill appears from the second Branch.
 */
export function BranchLine({
  count,
  name,
  onToggle,
  open,
}: {
  count: number;
  name: string;
  onToggle: () => void;
  open: boolean;
}) {
  if (count > 1) return <BranchPickerPill name={name} onPress={onToggle} open={open} />;
  return (
    <View
      accessibilityLabel={`Sucursal ${name}`}
      accessible
      style={styles.branch}
      testID="branch-fixed"
    >
      <Glyph color={colors.textMuted} name="pin" size={16} strokeWidth={1.5} />
      <Text style={styles.branchLabel}>
        {"Sucursal "}
        <Text style={styles.branchName}>{name}</Text>
      </Text>
    </View>
  );
}

/** 03's day strip: 48 × 60 Lino chips, today as «Hoy», the chosen day in Palo de rosa. */
export function DayStrip({
  dates,
  onSelect,
  selected,
  today,
}: {
  dates: readonly string[];
  onSelect: (date: string) => void;
  selected: string;
  today: string;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.chipRow}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      testID="browse-day-strip"
    >
      {dates.map((date) => {
        const label = dayChipLabel(date);
        const isSelected = date === selected;
        return (
          <Pressable
            accessibilityLabel={`${label.weekday} ${label.day}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={date}
            onPress={() => onSelect(date)}
            style={[styles.dayChip, isSelected && styles.daySelected]}
            testID={`browse-day-${date}`}
          >
            <Text style={[styles.dayWeekday, isSelected && styles.weekdaySelected]}>
              {date === today ? "Hoy" : label.weekday}
            </Text>
            <Text style={[styles.dayNumber, isSelected && styles.onSelected]}>{label.day}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** 03's Class Type chips: 36 high pills on Lino, the chosen one in Rosa profundo. */
export function ClassTypeStrip({
  onSelect,
  options,
  selected,
}: {
  onSelect: (id: string) => void;
  options: readonly { id: string; label: string }[];
  selected: string;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.chipRow}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      testID="browse-class-type-strip"
    >
      {options.map((option) => {
        const isSelected = option.id === selected;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  branch: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  branchLabel: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
  branchName: { color: colors.text, fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
  chip: {
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.mdLg,
  },
  chipLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
  chipLabelSelected: {
    color: colors.white,
    fontFamily: fontFamilies.bodyStrong,
    fontWeight: "600",
  },
  chipRow: { gap: spacing.sm },
  chipSelected: { backgroundColor: colors.emphasis },
  dayChip: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.button,
    gap: spacing.xxs,
    height: 60,
    justifyContent: "center",
    width: 48,
  },
  dayNumber: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 18 },
  daySelected: { backgroundColor: colors.primary },
  dayWeekday: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.tabLabel,
  },
  onSelected: { color: colors.white },
  // Horizontal strips keep their natural height: spare tablet height would
  // stretch them and an open Branch list would squash them.
  strip: { flexGrow: 0, flexShrink: 0 },
  weekdaySelected: { color: colors.white, fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
});
