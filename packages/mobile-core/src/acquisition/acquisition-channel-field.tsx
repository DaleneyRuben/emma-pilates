import { Keyboard, StyleSheet, View } from "react-native";

import { Chip } from "../ui/chip";
import { InlineError } from "../ui/inline-error";
import { Text } from "../ui/text";
import { spacing } from "../ui/tokens";

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
  /** Why an answer is marked already, such as «La marcamos por el código de Lucía.» */
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
      {note === undefined ? null : <Text variant="secundario">{note}</Text>}
      {error === undefined ? null : <InlineError field>{error}</InlineError>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
