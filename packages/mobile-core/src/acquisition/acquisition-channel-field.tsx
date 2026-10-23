import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "../ui/fonts";
import { colors, radii, spacing, typography } from "../ui/tokens";

/** BKM-011: the eight answers to «¿Cómo nos conociste?», in the owner's order. */
export const acquisitionChannelOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "friend", label: "Recomendación de una amiga" },
  { value: "trainer", label: "Una instructora" },
  { value: "walk_in", label: "Pasé por el estudio" },
  { value: "other", label: "Otro" },
] as const;

export type AcquisitionChannelChoice = (typeof acquisitionChannelOptions)[number]["value"];

export const acquisitionChannelRequired = "Elige cómo nos conociste.";

/**
 * A wrapping row of chips that behaves as a radio group (follow-ups 140 and
 * 141): JavaScript only, so it reaches installed builds through EAS Update.
 */
export function AcquisitionChannelField({
  error,
  label = "¿Cómo nos conociste?",
  onChange,
  value,
}: {
  error?: string;
  label?: string;
  onChange: (value: AcquisitionChannelChoice) => void;
  value: AcquisitionChannelChoice | null;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.options}>
        {acquisitionChannelOptions.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              accessibilityLabel={option.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.value}
              onPress={() => {
                // A chip keeps an open keyboard (taps are "handled"), and the
                // phone pad has no return key to close it over the submit.
                Keyboard.dismiss();
                onChange(option.value);
              }}
              style={[
                styles.chip,
                selected ? styles.chipSelected : null,
                error !== undefined && !selected ? styles.chipError : null,
              ]}
              testID={`acquisition-channel-${option.value}`}
            >
              <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error === undefined ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  chipError: { borderColor: colors.error },
  chipLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  chipLabelSelected: { color: colors.white },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  error: {
    color: colors.errorText,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 20,
  },
  field: { gap: spacing.sm },
  label: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    textTransform: "uppercase",
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
