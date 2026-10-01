import { colors, radii, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text } from "react-native";

export function OutlinedButton({
  disabled = false,
  label,
  onPress,
  tone = "primary",
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "primary" | "error";
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.outlined, tone === "error" && styles.outlinedError]}
    >
      <Text
        style={[
          styles.outlinedLabel,
          tone === "error" && styles.outlinedLabelError,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabledLabel: { color: colors.disabledText },
  outlined: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  outlinedError: { borderColor: colors.error },
  outlinedLabel: { color: colors.primaryDeep, fontSize: typography.body, fontWeight: "500" },
  outlinedLabelError: { color: colors.errorText },
});
