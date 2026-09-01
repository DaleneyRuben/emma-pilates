import { Pressable, StyleSheet, Text } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, spacing, typography } from "./tokens";

type TextButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

export function TextButton({
  disabled = false,
  label,
  onPress,
}: TextButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={spacing.sm}
      onPress={onPress}
      style={styles.button}
    >
      <Text style={[styles.label, disabled && styles.disabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  disabled: {
    color: colors.disabledText,
  },
  label: {
    color: colors.primaryDeep,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    textDecorationLine: "underline",
  },
});
