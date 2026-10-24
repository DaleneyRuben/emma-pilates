import type { CashCloseDto } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  formatBolivianos,
  Heading,
  PrimaryButton,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { clockTime } from "../nutritionist/nutritionist-format";
import { describeDifference, formatSignedBolivianos } from "./cash-close-format";

function Line({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.line}>
      <BodyText style={styles.lineLabel}>{label}</BodyText>
      <Text style={[styles.lineValue, color === undefined ? null : { color }]}>{value}</Text>
    </View>
  );
}

// S25's closed state: after recording, or when the day was already closed.
export function CashCloseSummary({ close, onDone }: { close: CashCloseDto; onDone: () => void }) {
  const difference = describeDifference(close.differenceCentavos);
  return (
    <View style={styles.summary}>
      <View style={styles.icon}>
        <Text style={styles.glyph}>✓</Text>
      </View>
      <Heading accessibilityLabel="Caja cerrada" style={styles.centered}>
        Caja cerrada
      </Heading>
      <View style={styles.card}>
        <Line label="Efectivo esperado" value={formatBolivianos(close.expectedCentavos)} />
        <Line label="Efectivo contado" value={formatBolivianos(close.countedCentavos)} />
        <Line
          color={difference.text}
          label="Diferencia"
          value={formatSignedBolivianos(close.differenceCentavos)}
        />
        {close.note === null ? null : (
          <>
            <View style={styles.divider} />
            <BodyText style={styles.muted}>{close.note}</BodyText>
          </>
        )}
      </View>
      <BodyText style={[styles.muted, styles.centered]}>
        {`Cerrada por ${close.closedByName} a las ${clockTime(close.closedAt)}.`}
      </BodyText>
      <PrimaryButton label="Volver" onPress={onDone} testID="cash-close-done" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.sm, padding: spacing.lg },
  centered: { textAlign: "center" },
  divider: { backgroundColor: colors.border, height: 1 },
  glyph: { color: colors.white, fontSize: typography.titleSecondary, fontWeight: "600" },
  icon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.success,
    borderRadius: radii.pill,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  line: { flexDirection: "row", justifyContent: "space-between" },
  lineLabel: { color: colors.textMuted },
  lineValue: { color: colors.text, fontSize: typography.body, fontVariant: ["tabular-nums"] },
  muted: { color: colors.textMuted, fontSize: typography.note },
  summary: { gap: spacing.lg },
});
