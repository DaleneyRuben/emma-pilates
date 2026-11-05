import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { PhoneCountry } from "../account/phone-number";
import { Chevron } from "./chevron";
import { CountryPicker } from "./country-picker";
import { fontFamilies } from "./fonts";
import { colors, radii, spacing, typography } from "./tokens";

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

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, error === undefined ? null : styles.boxError]}>
        <Pressable
          accessibilityLabel={`País: ${country.name}, +${country.dial}`}
          accessibilityRole="button"
          onPress={() => setPicking(true)}
          style={styles.prefix}
          testID={testID === undefined ? undefined : `${testID}-country`}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={styles.code}>+{country.dial}</Text>
          <Chevron direction="down" size={16} strokeWidth={1.8} testID="phone-country-chevron" />
        </Pressable>
        <TextInput
          accessibilityLabel={label}
          autoComplete="tel"
          keyboardType="phone-pad"
          onChangeText={(typed) => onChange({ country, digits: typed })}
          placeholder={`${country.lengths[0]} dígitos`}
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          testID={testID}
          textContentType="telephoneNumber"
          value={digits}
        />
      </View>
      {error === undefined ? (
        helper === undefined ? null : (
          <Text style={styles.helper}>{helper}</Text>
        )
      ) : (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
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
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 52,
    overflow: "hidden",
  },
  boxError: { borderColor: colors.error, borderWidth: 1.5 },
  code: { color: colors.primaryOnTint, fontFamily: fontFamilies.bodyStrong, fontSize: 16 },
  error: {
    color: colors.errorText,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 20,
  },
  field: { gap: spacing.sm },
  flag: { fontSize: 20 },
  helper: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 20,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    minWidth: 0,
    paddingHorizontal: spacing.mdLg,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    textTransform: "uppercase",
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
