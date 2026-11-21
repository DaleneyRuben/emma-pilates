import { addCivilDays, PrimaryButton, Text, TextButton } from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

import { dayMonth, freezeRange } from "../subscription/freeze-window";

/**
 * Class detail on a frozen day (FIX-082, design audit 2026-11-18, option B):
 * the frozen days as a row title (C04j), the first day she can book, the off button that
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
        <Text style={styles.note} variant="titulo-fila">
          {`Tu plan está congelado ${range.charAt(0).toLowerCase()}${range.slice(1)}.`}
        </Text>
      </View>
      {/* Palette B: the reason line sits under the off button (FIX-089). */}
      <PrimaryButton
        disabled
        disabledReason={`Podrás reservar desde el ${dayMonth(addCivilDays(endsOn, 1))}.`}
        label="No disponible durante el congelamiento"
      />
      <TextButton label="Elegir otro día" onPress={onOtherDay} />
    </>
  );
}

const styles = StyleSheet.create({
  note: { textAlign: "center" },
});
