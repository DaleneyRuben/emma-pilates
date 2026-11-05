import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Polyline } from "react-native-svg";

import {
  frequentPhoneCountries,
  phoneCountries,
  searchPhoneCountries,
  type PhoneCountry,
} from "../account/phone-number";
import { fontFamilies } from "./fonts";
import { LineIcon } from "./line-icon";
import { PickerCheck } from "./picker-check";
import { colors, radii, spacing, typography } from "./tokens";

type CountryPickerProps = {
  visible: boolean;
  selected: PhoneCountry;
  onPick: (country: PhoneCountry) => void;
  onClose: () => void;
};

/**
 * FIX-037 (design A1–A3): the country list behind the phone prefix. An iPhone
 * draws it as a sheet with a grabber and «Cancelar»; Android as a full-screen
 * list with a back arrow and the search in the top bar.
 */
export function CountryPicker({ onClose, onPick, selected, visible }: CountryPickerProps) {
  const [query, setQuery] = useState("");
  const android = Platform.OS === "android";
  const close = () => {
    setQuery("");
    onClose();
  };
  const pick = (country: PhoneCountry) => {
    setQuery("");
    onPick(country);
  };

  const search = (
    <TextInput
      accessibilityLabel="Buscar país o código"
      autoCorrect={false}
      onChangeText={setQuery}
      placeholder="Buscar país o código"
      placeholderTextColor={colors.textSubtle}
      style={android ? styles.barSearch : styles.sheetSearch}
      value={query}
    />
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      presentationStyle={android ? "fullScreen" : "overFullScreen"}
      transparent={!android}
      visible={visible}
    >
      <View style={android ? styles.fullScreen : styles.scrim}>
        <View style={android ? styles.fullScreen : styles.sheet}>
          {android ? (
            <View style={styles.bar}>
              <Pressable
                accessibilityLabel="Volver"
                accessibilityRole="button"
                onPress={close}
                style={styles.back}
              >
                <LineIcon color={colors.text} size={22} strokeWidth={1.6}>
                  <Polyline points="19,12 5,12" />
                  <Polyline points="11,6 5,12 11,18" />
                </LineIcon>
              </Pressable>
              {search}
            </View>
          ) : (
            <>
              <View style={styles.grabber} />
              <View style={styles.header}>
                <Text accessibilityRole="header" style={styles.title}>
                  Elige el país
                </Text>
                <Pressable accessibilityRole="button" onPress={close} style={styles.cancel}>
                  <Text style={styles.cancelLabel}>Cancelar</Text>
                </Pressable>
              </View>
              {search}
            </>
          )}
          {android ? (
            <Text accessibilityRole="header" style={styles.hiddenTitle}>
              Elige el país
            </Text>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled">
            <CountryRows onPick={pick} query={query} selected={selected} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CountryRows({
  onPick,
  query,
  selected,
}: {
  onPick: (country: PhoneCountry) => void;
  query: string;
  selected: PhoneCountry;
}) {
  if (query.trim() !== "") {
    return searchPhoneCountries(query).map((country) => (
      <CountryRow
        country={country}
        key={country.iso}
        onPick={onPick}
        selected={country.iso === selected.iso}
      />
    ));
  }
  const others = (list: readonly PhoneCountry[]) =>
    list.filter((country) => country.iso !== selected.iso);
  return (
    <>
      <CountryRow country={selected} onPick={onPick} selected />
      <Text style={styles.section}>Frecuentes</Text>
      {others(frequentPhoneCountries).map((country) => (
        <CountryRow country={country} key={country.iso} onPick={onPick} selected={false} />
      ))}
      <Text style={styles.section}>Todos los países</Text>
      {others(phoneCountries).map((country) => (
        <CountryRow country={country} key={country.iso} onPick={onPick} selected={false} />
      ))}
    </>
  );
}

function CountryRow({
  country,
  onPick,
  selected,
}: {
  country: PhoneCountry;
  onPick: (country: PhoneCountry) => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={`${country.name}, +${country.dial}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPick(country)}
      style={[styles.row, selected ? styles.rowSelected : null]}
    >
      <Text style={styles.flag}>{country.flag}</Text>
      <Text style={styles.name}>{country.name}</Text>
      <Text style={styles.code}>+{country.dial}</Text>
      <PickerCheck selected={selected} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: "center", height: 48, justifyContent: "center", width: 48 },
  bar: {
    alignItems: "center",
    backgroundColor: colors.card,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingTop: 48,
  },
  barSearch: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 18,
    minHeight: 56,
  },
  cancel: { justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md },
  cancelLabel: { color: colors.primaryOnTint, fontFamily: fontFamilies.bodyStrong, fontSize: 15 },
  code: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  flag: { fontSize: 22 },
  fullScreen: { backgroundColor: colors.surface, flex: 1 },
  grabber: {
    alignSelf: "center",
    backgroundColor: colors.borderStrong,
    borderRadius: radii.pill,
    height: 5,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    width: 36,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
  },
  hiddenTitle: { height: 0, opacity: 0, position: "absolute" },
  name: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: 16 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.mdLg,
    minHeight: 52,
    paddingHorizontal: spacing.xl,
  },
  rowSelected: { backgroundColor: colors.primaryTint },
  scrim: { backgroundColor: colors.scrim, flex: 1, paddingTop: 84 },
  section: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.44,
    paddingBottom: spacing.smd,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    textTransform: "uppercase",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.frame,
    borderTopRightRadius: radii.frame,
    flex: 1,
    paddingBottom: spacing.xl,
  },
  sheetSearch: {
    backgroundColor: colors.card,
    borderRadius: radii.control,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.mdLg,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.heading,
    fontSize: typography.titleSecondary,
  },
});
