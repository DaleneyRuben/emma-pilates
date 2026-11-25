import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { phonePlaceholder, type PhoneCountry } from "../account/phone-number";
import { Chevron } from "./chevron";
import { CountryPicker } from "./country-picker";
import { fieldTextProps } from "./field-text";
import { InlineError } from "./inline-error";
import { Text } from "./text";
import { colors, radii, spacing } from "./tokens";

export type PhoneValue = { country: PhoneCountry; digits: string };

type PhoneFieldProps = {
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  label?: string;
  error?: string;
  helper?: string;
  testID?: string;
};

/**
 * FIX-037 (DES-006, follow-up 236, proposal A): one field whose left end is
 * a tappable «🇧🇴 +591 ⌄» prefix; the digits follow. The prefix opens the
 * country list; the value goes out through `storedPhone` as «+<code> <digits>».
 * Label `compacto-600`, digits and code `cuerpo`, helper and error
 * `secundario` (follow-up 285).
 */
export function PhoneField({
  error,
  helper,
  label = "Celular",
  onChange,
  testID,
  value,
}: PhoneFieldProps) {
  const [picking, setPicking] = useState(false);
  const { country, digits } = value;
  const fieldText = fieldTextProps(digits);

  return (
    <View style={styles.field}>
      <Text variant="compacto-600">{label}</Text>
      <View
        style={[styles.box, error === undefined ? null : styles.boxError]}
        testID="phone-field-box"
      >
        <Pressable
          accessibilityLabel={`País: ${country.name}, +${country.dial}`}
          accessibilityRole="button"
          onPress={() => setPicking(true)}
          style={styles.prefix}
          testID={testID === undefined ? undefined : `${testID}-country`}
        >
          <Text variant="destacado">{country.flag}</Text>
          <Text variant="cuerpo">+{country.dial}</Text>
          <Chevron direction="down" size={16} strokeWidth={1.8} testID="phone-country-chevron" />
        </Pressable>
        <TextInput
          accessibilityLabel={label}
          autoComplete="tel"
          keyboardType="phone-pad"
          maxFontSizeMultiplier={fieldText.maxFontSizeMultiplier}
          onChangeText={(typed) => onChange({ country, digits: typed })}
          placeholder={phonePlaceholder(country)}
          placeholderTextColor={fieldText.placeholderTextColor}
          style={[fieldText.style, styles.input]}
          testID={testID}
          textContentType="telephoneNumber"
          value={digits}
        />
      </View>
      {error === undefined ? (
        helper === undefined ? null : (
          <Text variant="secundario">{helper}</Text>
        )
      ) : (
        <InlineError field>{error}</InlineError>
      )}
      <CountryPicker
        onClose={() => setPicking(false)}
        onPick={(picked) => {
          setPicking(false);
          onChange({ country: picked, digits });
        }}
        selected={country}
        visible={picking}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderWidth: 1.5,
    flexDirection: "row",
    minHeight: 52,
    overflow: "hidden",
  },
  boxError: { borderColor: colors.error, borderWidth: 2 },
  field: { gap: spacing.smd },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.mdLg,
  },
  prefix: {
    alignItems: "center",
    borderColor: colors.hairline,
    borderRightWidth: 1,
    flexDirection: "row",
    gap: spacing.smd,
    minHeight: 44,
    paddingLeft: spacing.mdLg,
    paddingRight: spacing.smLg,
  },
});
