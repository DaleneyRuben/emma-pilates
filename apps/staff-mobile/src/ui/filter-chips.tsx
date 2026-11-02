import { colors, fontFamilies, radii, spacing } from "@pilates/mobile-core";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

export type FilterOption = { id: string; label: string };

/**
 * The v2 class-type filter (S07, S13): Lino pills, the chosen one Rosa tinte.
 * The strip keeps its height under a long list (`flexShrink: 0`, walkthrough 18).
 */
export function FilterChips({
  onSelect,
  options,
  selected,
  testID,
}: {
  onSelect: (id: string) => void;
  options: readonly FilterOption[];
  selected: string;
  testID?: string;
}) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.chips}
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      testID={testID}
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
            style={[styles.chip, isSelected && styles.selected]}
          >
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.mdLg,
  },
  chips: { gap: spacing.sm },
  label: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
  selected: { backgroundColor: colors.primaryTint },
  selectedLabel: { color: colors.primaryOnTint, fontFamily: fontFamilies.bodyStrong },
  strip: { flexGrow: 0, flexShrink: 0 },
});
