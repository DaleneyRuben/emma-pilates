import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, spacing, typography } from "./tokens";

export type SegmentedTabsProps<Key extends string> = {
  accessibilityLabel?: string;
  onSelect: (key: Key) => void;
  /** `disabled` greys a segment that cannot be chosen now (S10 after a payment is sent). */
  options: readonly { disabled?: boolean; key: Key; label: string; testID?: string }[];
  selected: Key;
  testID?: string;
};

/**
 * A two- or three-way switch under a screen title (follow-up 225 §9), as the
 * staff canvas draws it to keep one emphasis per screen: a Lino track, the
 * selected segment Rosa tinte with a 1.5 pt Palo de rosa ring, every label
 * Rosa enlace.
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
            <Text
              style={[
                styles.label,
                isSelected && styles.labelSelected,
                option.disabled === true && styles.disabled,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: { color: colors.disabledText },
  label: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
    fontWeight: "500",
  },
  labelSelected: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.bodyStrong,
    fontWeight: "600",
  },
  segment: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    height: 44,
    justifyContent: "center",
  },
  // FIX-089: the chosen segment is Rosa profundo with a Crema label.
  selected: { backgroundColor: colors.primary },
  track: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
  },
});
