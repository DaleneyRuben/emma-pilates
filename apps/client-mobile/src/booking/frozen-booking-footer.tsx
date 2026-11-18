import {
  addCivilDays,
  colors,
  fontFamilies,
  PrimaryButton,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { freezeRange, weekdayDayMonth } from "../subscription/freeze-window";

/**
 * Class detail on a frozen day (FIX-082, design audit 2026-11-18, option B):
 * the frozen days in bold, the first day she can book, the off button that
 * says why, and a way back to another day.
 */
export function FrozenBookingFooter({
  endsOn,
  onOtherDay,
  startsOn,
}: {
  endsOn: string;
  onOtherDay: () => void;
  startsOn: string;
}) {
  const range = freezeRange(startsOn, endsOn);
  return (
    <>
      <View>
        <Text style={[styles.note, styles.strong]}>
          {`Tu plan está congelado ${range.charAt(0).toLowerCase()}${range.slice(1)}.`}
        </Text>
        <Text style={styles.note}>
          {`Podrás reservar desde el ${weekdayDayMonth(addCivilDays(endsOn, 1))}.`}
        </Text>
      </View>
      <PrimaryButton disabled label="No disponible durante el congelamiento" />
      <TextButton label="Elegir otro día" onPress={onOtherDay} />
    </>
  );
}

const styles = StyleSheet.create({
  note: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: "center",
  },
  strong: { fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
});
