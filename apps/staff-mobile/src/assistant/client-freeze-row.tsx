import { formatListDate, type ClientOverviewDto } from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  colors,
  fontFamilies,
  Glyph,
  spacing,
  surfaces,
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

/** Staff pick E4 A (E-C09): the Freeze on its own white card, a snowflake ahead. */
export function ClientFreezeRow({ freeze }: { freeze: Freeze | null | undefined }) {
  const lines = freezeLines(freeze, boliviaCivilDate(new Date()));
  if (lines === null) return null;
  return (
    <View
      accessibilityLabel={`${lines.title}. ${lines.note}`}
      style={styles.row}
      testID="client-freeze-row"
    >
      <Glyph color={colors.text} name="snowflake" size={22} strokeWidth={1.6} />
      <View style={styles.body}>
        <Text style={styles.title}>{lines.title}</Text>
        <Text style={styles.note}>{lines.note}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  note: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  row: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
  },
});
