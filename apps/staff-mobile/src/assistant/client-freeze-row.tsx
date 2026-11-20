import { formatListDate, type ClientOverviewDto } from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  colors,
  fontFamilies,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

type Freeze = NonNullable<ClientOverviewDto["subscription"]["freeze"]>;

/**
 * FIX-090 (audit C3): the plan's Freeze, so front desk can say why a day
 * cannot be booked; nothing once it ended, or when refused or withdrawn.
 */
export function freezeLines(
  freeze: Freeze | null | undefined,
  today: string,
): { title: string; note: string } | null {
  if (freeze == null || freeze.endsOn < today) return null;
  const days = `del ${formatListDate(freeze.startsOn)} al ${formatListDate(freeze.endsOn)}`;
  if (freeze.state === "approved") {
    return { title: `Congelado ${days}`, note: "Aprobado · no puede reservar esos días" };
  }
  if (freeze.state === "requested") {
    return { title: `Pidió congelar ${days}`, note: "Está por revisar" };
  }
  return null;
}

/** Staff pick E4 A: the Freeze on its own row, Crema with an Arcilla border. */
export function ClientFreezeRow({ freeze }: { freeze: Freeze | null | undefined }) {
  const lines = freezeLines(freeze, boliviaCivilDate(new Date()));
  if (lines === null) return null;
  return (
    <View
      accessibilityLabel={`${lines.title}. ${lines.note}`}
      style={styles.row}
      testID="client-freeze-row"
    >
      <Text style={styles.title}>{lines.title}</Text>
      <Text style={styles.note}>{lines.note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  row: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.button,
    borderWidth: 1,
    gap: spacing.xxs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
});
