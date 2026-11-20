import { formatListDate } from "@pilates/api-contracts";
import type { OwnSalaryPaymentDto } from "@pilates/api-contracts";
import { Chevron, colors, fontFamilies, Glyph, spacing, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { statusTone } from "./pay-history";
import type { StatementStatus } from "./pay-ledger";
import { ReceiptThumbnail } from "./receipt-viewer";

function StripText({ title, note, link }: { title: string; note: string; link?: boolean }) {
  return (
    <View style={styles.stripBody}>
      <Text style={styles.stripTitle}>{title}</Text>
      <Text style={link === true ? styles.stripLink : styles.detail}>{note}</Text>
    </View>
  );
}

const iconTint = {
  paid: colors.successTint,
  unpaid: colors.warningTint,
  open: colors.primaryTint,
} as const;

/** Where the statement's money stands: its payment and receipt, or why not yet. */
export function PaymentStrip({
  onReceipt,
  status,
}: {
  onReceipt: (payment: OwnSalaryPaymentDto) => void;
  status: StatementStatus;
}) {
  const tone = statusTone[status.kind];
  const icon = (
    <View style={[styles.stripIcon, { backgroundColor: iconTint[status.kind] }]}>
      <Glyph color={tone.color} name={tone.glyph} size={20} strokeWidth={1.6} />
    </View>
  );
  if (status.kind === "open") {
    return (
      <View style={styles.strip}>
        {icon}
        <StripText
          note="Puede cambiar hasta que administración lo apruebe."
          title="Todavía sin aprobar"
        />
      </View>
    );
  }
  if (status.kind === "unpaid") {
    return (
      <View style={styles.strip}>
        {icon}
        <StripText note="Administración ya aprobó este total." title="Aprobada · falta el pago" />
      </View>
    );
  }
  const { payment } = status;
  const title = payment === undefined ? "Pagado" : `Pagado el ${formatListDate(payment.paidOn)}`;
  const receiptUrl = payment?.receiptUrl ?? null;
  if (payment === undefined || receiptUrl === null) {
    return (
      <View style={styles.strip}>
        {icon}
        <StripText note="Sin comprobante adjunto" title={title} />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={`Ver el comprobante del pago del ${formatListDate(payment.paidOn)}`}
      accessibilityRole="button"
      onPress={() => onReceipt(payment)}
      style={({ pressed }) => [styles.strip, pressed && styles.pressed]}
    >
      <ReceiptThumbnail url={receiptUrl} />
      <StripText link note="Ver comprobante" title={title} />
      <Chevron size={16} strokeWidth={1.5} tone="muted" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  detail: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  pressed: { opacity: 0.8 },
  strip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smLg,
  },
  stripBody: { flex: 1, gap: 2 },
  stripIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  stripLink: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "600",
  },
  stripTitle: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 15 },
});
