import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { Text } from "./text";
import { spacing } from "./tokens";

type TextButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Kept for callers: «error» and «onTint» draw the same ink link, since an
   * error is said in words, never in colour (follow-up 285). */
  tone?: "default" | "error" | "onTint";
  /** @deprecated Every standalone link is underlined (follow-up 285). */
  underline?: boolean;
};

/**
 * A standalone link or action, such as «Volver» or «¿Olvidaste tu
 * contraseña?» (follow-up 285): `enlace`, Work Sans 14 · 700, underlined, in
 * ink, with a 44 pt tap height.
 */
export function TextButton({ disabled = false, label, onPress, style, testID }: TextButtonProps) {
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
      <Text variant="enlace">{label}</Text>
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
});
