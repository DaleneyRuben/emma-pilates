import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "./text";
import { colors, shadows, spacing } from "./tokens";

export type SegmentedTabsProps<Key extends string> = {
  accessibilityLabel?: string;
  onSelect: (key: Key) => void;
  /** `disabled` marks a segment that cannot be chosen now (S10 after a payment is sent):
   * it ignores taps and says so to a screen reader; its label stays ink. */
  options: readonly { disabled?: boolean; key: Key; label: string; testID?: string }[];
  selected: Key;
  testID?: string;
};

/**
 * A two- or three-way switch under a screen title (follow-up 225 §9), as the
 * staff canvas draws it to keep one emphasis per screen: a Lino track, the
 * selected segment 600 with a white label, every label `boton-chico` in the
 * same weight (follow-up 285).
 */
export function SegmentedTabs<Key extends string>({
  accessibilityLabel,
  onSelect,
  options,
  selected,
  testID,
}: SegmentedTabsProps<Key>) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tablist"
      style={styles.track}
      testID={testID}
    >
      {options.map((option) => {
        const isSelected = option.key === selected;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="tab"
            accessibilityState={
              option.disabled === true
                ? { disabled: true, selected: isSelected }
                : { selected: isSelected }
            }
            key={option.key}
            onPress={() => {
              if (option.disabled !== true) onSelect(option.key);
            }}
            style={[styles.segment, isSelected && styles.selected]}
            testID={option.testID}
          >
            <Text tone={isSelected ? "onDark" : "ink"} variant="boton-chico">
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    height: 44,
    justifyContent: "center",
  },
  // Rosa Emma: the chosen segment is 600 with a white label on a white track.
  selected: { backgroundColor: colors.primary },
  track: {
    ...shadows.card,
    backgroundColor: colors.card,
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
  },
});
