import { colors, fontFamilies, radii, spacing } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { InitialsDisc } from "../ui/person-row";

// The persistent reminder of whose behalf the Assistant is acting on (v2 S07,
// S08, S09, S10): her initials and «Reservando para **Lucía**» on Lino.
export function ClientBanner({
  action,
  clientName,
  detail,
}: {
  action:
    | "Para"
    | "Reservando para"
    | "Registrando pago para"
    | "Viendo reservas de"
    | "Viendo historial de";
  clientName: string;
  /** A quiet tail such as «8 clases en su plan». */
  detail?: string;
}) {
  return (
    <View style={styles.banner} testID="client-banner">
      <InitialsDisc name={clientName} size={32} />
      <Text style={styles.text}>
        {`${action} `}
        <Text style={styles.name}>{clientName}</Text>
        {detail === undefined ? null : ` · ${detail}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.button,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.smLg,
  },
  name: { color: colors.text, fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
  text: { color: colors.textMuted, flex: 1, fontFamily: fontFamilies.body, fontSize: 14 },
});
