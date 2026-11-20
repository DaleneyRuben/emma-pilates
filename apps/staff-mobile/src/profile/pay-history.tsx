import { formatMoney } from "@pilates/api-contracts";
import type { OwnSalaryPaymentDto, PayStatementDto } from "@pilates/api-contracts";
import { Chevron, colors, fontFamilies, Glyph, spacing, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { RowCard } from "./card-pieces";
import { type StatementStatus, statementStatus, statusLine } from "./pay-ledger";
import { payPeriodHeading } from "./pay-period-heading";

// Each status keeps one icon and one colour, here and on the statement screen.
export const statusTone = {
  paid: { glyph: "check", color: colors.successText },
  unpaid: { glyph: "clock", color: colors.warningText },
  open: { glyph: "hourglass", color: colors.primaryOnTint },
} as const satisfies Record<StatementStatus["kind"], unknown>;

// Finding 111, proposal B: one compact row per statement, newest first; a
// row opens the statement's own screen.
export function PayHistory({
  onOpen,
  payments,
  statements,
}: {
  onOpen: (statementId: string) => void;
  payments: OwnSalaryPaymentDto[];
  statements: PayStatementDto[];
}) {
  return (
    <RowCard label="Historial">
      {statements.map((statement) => {
        const { heading, label } = payPeriodHeading(statement);
        const status = statementStatus(statement, payments);
        const tone = statusTone[status.kind];
        return (
          <Pressable
            accessibilityLabel={`${label}, ${statusLine(status)}, ${formatMoney(statement.totalCentavos)}`}
            accessibilityRole="button"
            key={statement.id}
            onPress={() => onOpen(statement.id)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            testID="pay-history-row"
          >
            <View style={styles.body}>
              <Text style={styles.period}>{heading}</Text>
              <View style={styles.status}>
                <Glyph color={tone.color} name={tone.glyph} size={15} strokeWidth={1.6} />
                <Text style={[styles.statusText, { color: tone.color }]}>{statusLine(status)}</Text>
              </View>
            </View>
            <Text style={styles.amount}>{formatMoney(statement.totalCentavos)}</Text>
            <Chevron size={16} strokeWidth={1.5} tone="muted" />
          </Pressable>
        );
      })}
    </RowCard>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.titleSmall,
    fontVariant: ["tabular-nums"],
  },
  body: { flex: 1, gap: spacing.xs },
  period: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  pressed: { backgroundColor: colors.surfaceSubtle },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 68,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingVertical: spacing.md,
  },
  status: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  statusText: { fontFamily: fontFamilies.body, fontSize: typography.note },
});
