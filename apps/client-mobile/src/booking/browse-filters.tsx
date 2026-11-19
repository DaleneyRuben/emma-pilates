import {
  BranchPickerPill,
  Chip,
  chipStyles,
  colors,
  dayChipLabel,
  fontFamilies,
  Glyph,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import type { ReactNode } from "react";
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

/**
 * 03's day strip: 60-high day chips, today as «Hoy», the chosen day in Rosa
 * profundo with Crema labels (palette B chips, FIX-089). The seven days share
 * the width: 48-wide chips clipped the last one on a 411-wide Android phone
 * (MOB-074).
 */
export function DayStrip({
  dates,
  onSelect,
  selected,
  today,
  trailing,
}: {
  dates: readonly string[];
  onSelect: (date: string) => void;
  selected: string;
  today: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={[styles.strip, styles.dayRow]} testID="browse-day-strip">
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
            style={[styles.dayChip, chipStyles.box, isSelected && chipStyles.boxSelected]}
            testID={`browse-day-${date}`}
          >
            <Text style={[styles.dayWeekday, isSelected && chipStyles.labelSelected]}>
              {date === today ? "Hoy" : label.weekday}
            </Text>
            <Text style={[styles.dayNumber, isSelected && styles.onSelected]}>{label.day}</Text>
          </Pressable>
        );
      })}
      {trailing}
    </View>
  );
}

/**
 * C03d (FIX-031, follow-up 234): S13's «Otra» at the end of a strip whose
 * booking window is wider than seven days; a later day picked there shows
 * its number on the selected chip.
 */
export function DayStripOther({
  accessibilityLabel,
  label,
  onPress,
  selected,
}: {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.dayChip, chipStyles.box, selected && chipStyles.boxSelected]}
      testID="browse-day-other"
    >
      <Text style={selected ? [styles.dayNumber, styles.onSelected] : styles.otherLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

/** 03's Class Type filter: a row of palette B chips (FIX-089). */
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
      contentContainerStyle={styles.tabRow}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      testID="browse-class-type-strip"
    >
      {options.map((option) => (
        <Chip
          key={option.id}
          label={option.label}
          onPress={() => onSelect(option.id)}
          selected={option.id === selected}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  branch: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  branchLabel: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
  branchName: { color: colors.text, fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
  dayChip: {
    alignItems: "center",
    borderRadius: radii.button,
    gap: spacing.xxs,
    flex: 1,
    height: 60,
    justifyContent: "center",
    minWidth: 0,
  },
  dayNumber: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 18 },
  dayRow: { flexDirection: "row", gap: spacing.sm },
  dayWeekday: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.label,
  },
  onSelected: { color: colors.onPrimary },
  otherLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "600",
  },
  // Horizontal strips keep their natural height: spare tablet height would
  // stretch them and an open Branch list would squash them.
  strip: { flexGrow: 0, flexShrink: 0 },
  // The chips' 38 pt plus their hit slop reach 44 pt; the row keeps the room.
  tabRow: { alignItems: "center", flexGrow: 1, gap: spacing.sm, paddingVertical: spacing.xxs },
});
