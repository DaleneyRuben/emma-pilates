import { useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Polyline } from "react-native-svg";

import {
  frequentPhoneCountries,
  phoneCountries,
  searchPhoneCountries,
  type PhoneCountry,
} from "../account/phone-number";
import { fieldTextProps } from "./field-text";
import { LineIcon } from "./line-icon";
import { PickerCheck } from "./picker-check";
import { SheetTitle } from "./sheet-title";
import { Text } from "./text";
import { colors, radii, spacing } from "./tokens";

type CountryPickerProps = {
  visible: boolean;
  selected: PhoneCountry;
  onPick: (country: PhoneCountry) => void;
  onClose: () => void;
};

/**
 * FIX-037 (design A1–A3): the country list behind the phone prefix. An iPhone
 * draws it as a sheet with a grabber and «Cancelar»; Android as a full-screen
 * list with a back arrow and the search in the top bar. Both are white, so
 * the rows' small text never stands on 100 (follow-up 285).
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

  const fieldText = fieldTextProps(query);
  const search = (
    <TextInput
      {...fieldText}
      accessibilityLabel="Buscar país o código"
      autoCorrect={false}
      onChangeText={setQuery}
      placeholder="Buscar país o código"
      style={[fieldText.style, android ? styles.barSearch : styles.sheetSearch]}
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
                <SheetTitle style={styles.title}>Elige el país</SheetTitle>
                <Pressable accessibilityRole="button" onPress={close} style={styles.cancel}>
                  <Text variant="enlace">Cancelar</Text>
                </Pressable>
              </View>
              {search}
            </>
          )}
          {android ? (
            <View style={styles.hiddenTitle}>
              <SheetTitle>Elige el país</SheetTitle>
            </View>
          ) : null}
          {/* Every country libphonenumber knows (about 245 rows): a FlatList
              mounts only the rows on screen. */}
          <FlatList
            data={countryItems(query, selected)}
            initialNumToRender={20}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) =>
              item.kind === "section" ? (
                <Text style={styles.section} variant="etiqueta">
                  {item.title}
                </Text>
              ) : (
                <CountryRow country={item.country} onPick={pick} selected={item.selected} />
              )
            }
          />
        </View>
      </View>
    </Modal>
  );
}

type CountryItem =
  | { kind: "section"; key: string; title: string }
  | { kind: "country"; key: string; country: PhoneCountry; selected: boolean };

const countryItem = (country: PhoneCountry, selected: boolean, group: string): CountryItem => ({
  country,
  key: `${group}-${country.iso}`,
  kind: "country",
  selected,
});

/** The chosen country, «Frecuentes» and «Todos los países»; or the matches. */
function countryItems(query: string, selected: PhoneCountry): CountryItem[] {
  if (query.trim() !== "") {
    return searchPhoneCountries(query).map((country) =>
      countryItem(country, country.iso === selected.iso, "match"),
    );
  }
  const others = (list: readonly PhoneCountry[], group: string) =>
    list
      .filter((country) => country.iso !== selected.iso)
      .map((country) => countryItem(country, false, group));
  return [
    countryItem(selected, true, "chosen"),
    { key: "frequent", kind: "section", title: "Frecuentes" },
    ...others(frequentPhoneCountries, "frequent"),
    { key: "all", kind: "section", title: "Todos los países" },
    ...others(phoneCountries, "all"),
  ];
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
      <Text variant="destacado">{country.flag}</Text>
      <Text style={styles.name} variant="cuerpo">
        {country.name}
      </Text>
      <Text variant="cuerpo">+{country.dial}</Text>
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
  barSearch: { flex: 1, minHeight: 56 },
  cancel: { justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md },
  fullScreen: { backgroundColor: colors.card, flex: 1 },
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
  hiddenTitle: { height: 0, opacity: 0, overflow: "hidden", position: "absolute" },
  name: { flex: 1 },
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
    paddingBottom: spacing.smd,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.frame,
    borderTopRightRadius: radii.frame,
    flex: 1,
    paddingBottom: spacing.xl,
  },
  // The search on the white sheet: a 50 box with a 400 outline.
  sheetSearch: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.mdLg,
  },
  title: { flex: 1 },
});
