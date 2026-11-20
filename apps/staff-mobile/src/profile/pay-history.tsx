import { formatMoney } from "@pilates/api-contracts";
import type { OwnSalaryPaymentDto, PayStatementDto } from "@pilates/api-contracts";
import { Chevron, colors, Glyph, spacing, Text } from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

import { RowCard } from "../ui/card-pieces";
import { type StatementStatus, statementStatus, statusLine } from "./pay-ledger";
import { payPeriodHeading } from "./pay-period-heading";

// Each status keeps one icon, here and on the statement screen; its words say
// the status in the one ink (follow-up 285: never a colour of its own).
export const statusTone = {
  paid: { glyph: "check", tone: "ink" },
  unpaid: { glyph: "clock", tone: "ink" },
  open: { glyph: "hourglass", tone: "ink" },
} as const satisfies Record<StatementStatus["kind"], { glyph: string; tone: "ink" | "onDark" }>;

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
              <Text variant="titulo-fila">{heading}</Text>
              <View style={styles.status}>
                <Glyph color={colors.text} name={tone.glyph} size={15} strokeWidth={1.6} />
                <Text tone={tone.tone} variant="secundario">
                  {statusLine(status)}
                </Text>
              </View>
            </View>
            <Text variant="cifra">{formatMoney(statement.totalCentavos)}</Text>
            <Chevron size={16} strokeWidth={1.5} tone="muted" />
          </Pressable>
        );
      })}
    </RowCard>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xs },
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
});
