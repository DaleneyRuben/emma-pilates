import { formatMoney, formatListDate } from "@pilates/api-contracts";
import type { OwnSalaryPaymentDto } from "@pilates/api-contracts";
import {
  Chevron,
  colors,
  fontFamilies,
  Glyph,
  SectionTitle,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ReceiptThumbnail, useReceiptViewer } from "./receipt-viewer";

function PaymentText({ payment }: { payment: OwnSalaryPaymentDto }) {
  const receipt = (payment.receiptUrl ?? null) === null ? "sin comprobante" : "ver comprobante";
  return (
    <View style={styles.body}>
      <Text style={styles.amount}>{formatMoney(payment.amountCentavos)}</Text>
      <Text style={styles.date}>{`${formatListDate(payment.paidOn)} · ${receipt}`}</Text>
    </View>
  );
}

// Finding 111: a payment Nómina recorded without a statement, such as one
// paid by hand. A row with a receipt opens it; one without shows a payment
// icon and is inert.
export function OtherPayments({
  payments,
  title = "Otros pagos",
}: {
  payments: OwnSalaryPaymentDto[];
  /** «Pagos» when she has no statement at all (E8: the Assistant, the Nutritionist). */
  title?: string;
}) {
  const receipts = useReceiptViewer();
  return (
    <View accessibilityLabel={title} style={styles.section}>
      <SectionTitle>{title}</SectionTitle>
      <View style={styles.group}>
        {payments.map((payment, index) => {
          const divider = index > 0 && styles.divider;
          const receiptUrl = payment.receiptUrl ?? null;
          if (receiptUrl === null) {
            return (
              <View key={payment.id} style={[styles.row, divider]}>
                <View style={styles.icon}>
                  <Glyph name="card" size={20} />
                </View>
                <PaymentText payment={payment} />
              </View>
            );
          }
          return (
            <Pressable
              accessibilityLabel={`Ver el comprobante del pago del ${formatListDate(payment.paidOn)}, ${formatMoney(payment.amountCentavos)}`}
              accessibilityRole="button"
              key={payment.id}
              onPress={() => receipts.show(payment)}
              style={({ pressed }) => [styles.row, divider, pressed && styles.pressed]}
            >
              <ReceiptThumbnail url={receiptUrl} />
              <PaymentText payment={payment} />
              <Chevron size={16} strokeWidth={1.5} tone="muted" />
            </Pressable>
          );
        })}
      </View>
      {receipts.error}
      {receipts.viewer}
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  body: { flex: 1, gap: 2 },
  date: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  divider: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  group: { ...surfaces.flatCard, overflow: "hidden" },
  // FIX-089: the icon stands alone, with no tinted box behind it.
  icon: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  pressed: { backgroundColor: colors.background },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  section: { gap: spacing.md },
});
