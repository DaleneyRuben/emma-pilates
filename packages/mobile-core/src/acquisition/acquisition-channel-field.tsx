import { Keyboard, StyleSheet, View } from "react-native";

import { Chip } from "../ui/chip";
import { Glyph } from "../ui/glyph";
import { InlineError } from "../ui/inline-error";
import { Text } from "../ui/text";
import { colors, spacing } from "../ui/tokens";

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
  note,
  onChange,
  value,
}: {
  error?: string;
  label?: string;
  /** Why an answer is marked already, after a check: «La marcamos por el código de Lucía.» (C01b5) */
  note?: string;
  onChange: (value: AcquisitionChannelChoice) => void;
  value: AcquisitionChannelChoice | null;
}) {
  return (
    <View style={styles.field}>
      <Text variant="compacto-600">{label}</Text>
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
      {note === undefined ? null : (
        <View style={styles.note}>
          <Glyph
            color={colors.text}
            name="check"
            size={16}
            strokeWidth={1.7}
            testID="acquisition-channel-note-check"
          />
          <Text style={styles.noteText} variant="secundario">
            {note}
          </Text>
        </View>
      )}
      {error === undefined ? null : <InlineError field>{error}</InlineError>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  note: { alignItems: "center", flexDirection: "row", gap: spacing.smd },
  noteText: { flexShrink: 1 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
