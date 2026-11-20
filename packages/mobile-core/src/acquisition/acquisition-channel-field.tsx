import { Keyboard, StyleSheet, Text, View } from "react-native";

import { Chip } from "../ui/chip";
import { fontFamilies } from "../ui/fonts";
import { colors, spacing, typography } from "../ui/tokens";

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
 * A wrapping row of palette B chips that behaves as a radio group (follow-ups
 * 140 and 141, C6 B): JavaScript only, so it reaches installed builds through
 * EAS Update. The label reads like a form field's.
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
        {acquisitionChannelOptions.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            onPress={() => {
              // A chip keeps an open keyboard (taps are "handled"), and the
              // phone pad has no return key to close it over the submit.
              Keyboard.dismiss();
              onChange(option.value);
            }}
            role="radio"
            selected={option.value === value}
            testID={`acquisition-channel-${option.value}`}
          />
        ))}
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
  error: {
    color: colors.errorText,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "700",
    lineHeight: 20,
  },
  field: { gap: spacing.sm },
  label: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    fontWeight: "600",
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
