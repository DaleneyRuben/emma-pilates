import { Pressable, StyleSheet, Text } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, spacing, typography } from "./tokens";

type TextButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
  /** «onTint» for a link on Palo de rosa tinte, such as a pending card's. */
  tone?: "default" | "onTint";
};

export function TextButton({
  disabled = false,
  label,
  onPress,
  testID,
  tone = "default",
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
      testID={testID}
    >
      <Text style={[styles.label, tone === "onTint" && styles.onTint, disabled && styles.disabled]}>
        {label}
      </Text>
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
  onTint: {
    color: colors.primaryOnTint,
  },
  label: {
    color: colors.primaryDeep,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    textDecorationLine: "underline",
  },
});
