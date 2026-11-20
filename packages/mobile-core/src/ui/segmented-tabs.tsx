import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, shadows, spacing, typography } from "./tokens";

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
    fontFamily: fontFamilies.bodyBold,
    fontWeight: "700",
  },
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
