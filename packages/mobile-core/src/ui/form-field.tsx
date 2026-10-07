import { StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, radii, spacing, typography } from "./tokens";

type FormFieldProps = TextInputProps & {
  error?: string;
  label: string;
};

export function FormField({ error, label, style, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, error === undefined ? null : styles.inputError, style]}
      />
      {error === undefined ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.errorText,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 20,
  },
  field: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  inputError: {
    borderColor: colors.error,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    textTransform: "uppercase",
  },
});
