import {
  Chevron,
  colors,
  CountryPicker,
  fontFamilies,
  spacing,
  typography,
  type PhoneValue,
} from "@pilates/mobile-core";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

/**
 * FIX-037 (follow-up 236, S05): the phone row of a Lino group. The tappable
 * «🇧🇴 +591 ⌄» prefix sits left of a hairline, «Celular» and the digits right.
 */
export function GroupedPhoneField({
  error,
  onChange,
  testID,
  value,
}: {
  error?: string;
  onChange: (value: PhoneValue) => void;
  testID?: string;
  value: PhoneValue;
}) {
  const [picking, setPicking] = useState(false);
  const { country, digits } = value;

  return (
    <View>
      <View style={styles.row}>
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
        <View style={styles.column}>
          <Text style={styles.label}>Celular</Text>
          <TextInput
            accessibilityLabel="Celular"
            keyboardType="phone-pad"
            onChangeText={(typed) => onChange({ country, digits: typed })}
            placeholder={`${country.lengths[0]} dígitos`}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            testID={testID}
            value={digits}
          />
        </View>
      </View>
      {error === undefined ? null : (
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
  code: { color: colors.primaryOnTint, fontFamily: fontFamilies.bodyStrong, fontSize: 16 },
  column: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
    paddingBottom: spacing.smd,
    paddingLeft: spacing.mdLg,
    paddingRight: spacing.lg,
    paddingTop: spacing.smLg,
  },
  error: {
    color: colors.errorText,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    paddingBottom: spacing.smd,
    paddingHorizontal: spacing.lg,
  },
  flag: { fontSize: 20 },
  input: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    minHeight: 32,
    padding: 0,
  },
  label: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  prefix: {
    alignItems: "center",
    borderColor: colors.hairline,
    borderRightWidth: 1,
    flexDirection: "row",
    gap: spacing.smd,
    minHeight: 44,
    paddingLeft: spacing.lg,
    paddingRight: spacing.smLg,
  },
  row: { alignItems: "stretch", flexDirection: "row" },
});
