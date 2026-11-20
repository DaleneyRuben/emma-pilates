import {
  BodyText,
  BranchPickerPill,
  Chip,
  colors,
  dayChipLabel,
  fontFamilies,
  Glyph,
  PickerCheck,
  radii,
  spacing,
  surfaces,
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
 * C03's day strip inside the band: 64-high white tiles, today as «Hoy», the
 * chosen day in 600 with white labels (Rosa Emma). The seven days share
 * the width: 48-wide chips clipped the last one on a 411-wide Android phone
 * (MOB-074).
 */
export function DayStrip({
  dates,
  frozen = () => false,
  onSelect,
  selected,
  today,
  trailing,
}: {
  dates: readonly string[];
  /** C1 B: a day inside an approved Freeze carries a lock and says so. */
  frozen?: (date: string) => boolean;
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
        const isFrozen = frozen(date);
        return (
          <Pressable
            accessibilityLabel={`${label.weekday} ${label.day}${isFrozen ? ", congelado" : ""}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={date}
            onPress={() => onSelect(date)}
            style={[styles.dayChip, isSelected && styles.dayChipSelected]}
            testID={`browse-day-${date}`}
          >
            <Text style={[styles.dayWeekday, isSelected && styles.onSelected]}>
              {date === today ? "Hoy" : label.weekday}
            </Text>
            <Text style={[styles.dayNumber, isSelected && styles.onSelected]}>{label.day}</Text>
            {isFrozen ? (
              <Glyph
                color={isSelected ? colors.onPrimary : colors.text}
                name="lock"
                size={12}
                strokeWidth={1.75}
              />
            ) : null}
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
      style={[styles.dayChip, selected && styles.dayChipSelected]}
      testID="browse-day-other"
    >
      <Text style={selected ? [styles.dayNumber, styles.onSelected] : styles.otherLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * C03e: the Branches on a white card under the band, the chosen one in bold
 * with its check.
 */
export function BranchSheet({
  branches,
  onSelect,
  selectedId,
}: {
  branches: readonly { address: string; id: string; name: string }[];
  onSelect: (id: string) => void;
  selectedId: string | undefined;
}) {
  return (
    <View style={styles.branchSheet}>
      <BodyText style={styles.sheetTitle}>Elige una sucursal</BodyText>
      {branches.map((branch, index) => (
        <Pressable
          accessibilityLabel={branch.name}
          accessibilityRole="button"
          accessibilityState={{ selected: branch.id === selectedId }}
          key={branch.id}
          onPress={() => onSelect(branch.id)}
          style={[styles.branchRow, index > 0 && styles.branchRule]}
        >
          <View style={styles.branchText}>
            <Text
              style={[styles.branchRowName, branch.id === selectedId && styles.branchNameSelected]}
            >
              {branch.name}
            </Text>
            <BodyText style={styles.branchAddress}>{branch.address}</BodyText>
          </View>
          <PickerCheck selected={branch.id === selectedId} testID={`picker-check-${branch.id}`} />
        </Pressable>
      ))}
    </View>
  );
}

/** C03's Class Type filter: a row of Rosa Emma chips under the band. */
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
  // The fixed Branch rides on the band's white capsule, like the picker pill.
  branch: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.mdLg,
  },
  branchAddress: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  branchLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
  branchName: { color: colors.text, fontFamily: fontFamilies.bodyBold, fontWeight: "700" },
  // Rosa Emma marks the chosen Branch by weight, not another colour (FIX-089).
  branchNameSelected: { fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
  branchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.mdLg,
  },
  branchRowName: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.bodyMedium,
    fontWeight: "500",
  },
  branchRule: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  branchSheet: { ...surfaces.card, gap: spacing.xxs, padding: spacing.lg },
  branchText: { flex: 1, gap: spacing.xxs },
  dayChip: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.inset,
    gap: 3,
    flex: 1,
    height: 64,
    justifyContent: "center",
    minWidth: 0,
  },
  dayChipSelected: { backgroundColor: colors.primary },
  dayNumber: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 18 },
  dayRow: { flexDirection: "row", gap: 5 },
  dayWeekday: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
  },
  onSelected: { color: colors.onPrimary },
  otherLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 11 * 0.14,
    textTransform: "uppercase",
  },
  // Horizontal strips keep their natural height: spare tablet height would
  // stretch them and an open Branch list would squash them.
  strip: { flexGrow: 0, flexShrink: 0 },
  // The chips' 38 pt plus their hit slop reach 44 pt; the row keeps the room.
  tabRow: { alignItems: "center", flexGrow: 1, gap: spacing.sm, paddingVertical: spacing.xxs },
});
