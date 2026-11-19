import { Chip, spacing } from "@pilates/mobile-core";
import { ScrollView, StyleSheet } from "react-native";

export type FilterOption = { id: string; label: string };

/**
 * The class-type filter (S07, S13) as palette B chips (FIX-089): the chosen
 * one Rosa profundo, the others Crema with an Arcilla outline. The strip keeps
 * its height under a long list (`flexShrink: 0`, walkthrough 18).
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
  // The chips' hit slop reaches past the strip's edge.
  chips: { gap: spacing.sm, paddingVertical: 3 },
  strip: { flexGrow: 0, flexShrink: 0 },
});
