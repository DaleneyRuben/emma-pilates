import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, spacing, typography } from "./tokens";

type TextButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** «onTint» for a link on Palo de rosa tinte, such as a pending card's;
   * «error» for a destructive card action (follow-up 226). */
  tone?: "default" | "error" | "onTint";
  /** Bold and underlined, as the boards draw a link in a footer or on 600. */
  underline?: boolean;
};

export function TextButton({
  disabled = false,
  label,
  onPress,
  style,
  testID,
  tone = "default",
  underline = false,
}: TextButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={spacing.sm}
      onPress={onPress}
      style={[styles.button, style]}
      testID={testID}
    >
      <Text
        style={[
          styles.label,
          underline && styles.underline,
          tone === "error" && styles.error,
          disabled && styles.disabled,
        ]}
      >
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
  error: {
    color: colors.error,
  },
  // Follow-up 225 §4: Rosa enlace, which already reads on Lino and Rosa tinte,
  // so «onTint» draws the same; no underline.
  label: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontWeight: "700",
  },
  underline: { textDecorationLine: "underline" },
});
