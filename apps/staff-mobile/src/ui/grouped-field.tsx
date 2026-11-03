import { colors, fontFamilies, spacing, typography } from "@pilates/mobile-core";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";

/**
 * A field inside a Lino group (v2 S05): the label in 13 Texto tenue over a
 * borderless 16 pt input. Put several in `IconRowGroup` for the hairlines.
 */
export function GroupedField({
  error,
  label,
  ...input
}: Omit<TextInputProps, "accessibilityLabel" | "style"> & { error?: string; label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
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
  error: { color: colors.errorText, fontFamily: fontFamilies.body, fontSize: typography.note },
  field: {
    gap: spacing.xxs,
    paddingBottom: spacing.smd,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.smLg,
  },
  input: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    minHeight: 32,
    padding: 0,
  },
  label: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
});
