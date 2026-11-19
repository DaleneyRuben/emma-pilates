import { formatMoney, formatListDate } from "@pilates/api-contracts";
import type {
  OwnSalaryPaymentDto,
  PayStatementDto,
  PayStatementLineDto,
} from "@pilates/api-contracts";
import {
  CardActionRow,
  Chevron,
  colors,
  fontFamilies,
  Glyph,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { statusTone } from "./pay-history";
import type { StatementStatus } from "./pay-ledger";
import { ReceiptThumbnail } from "./receipt-viewer";

type LineKind = PayStatementLineDto["kind"];

// S29: the statement sums by concept in this order; each line keeps its own
// label. The bar above the sums paints each concept in its colour.
const concepts: { kind: LineKind; summary: string; line: string; color: string }[] = [
  { kind: "class", summary: "Clases dictadas", line: "Clase", color: colors.emphasis },
  {
    kind: "minimum_not_met",
    summary: "Canceladas por mínimo",
    line: "Clase cancelada por mínimo",
    color: colors.border,
  },
  { kind: "commission", summary: "Comisiones", line: "Comisión", color: colors.primary },
  { kind: "base", summary: "Base", line: "Base", color: colors.primaryTint },
  {
    kind: "new_client",
    summary: "Clientas nuevas",
    line: "Clienta nueva",
    color: colors.primary,
  },
  { kind: "bonus", summary: "Bono", line: "Bono", color: colors.emphasis },
];

const lineLabel = (kind: LineKind) => concepts.find((concept) => concept.kind === kind)?.line;

const known = new Set<string>(concepts.map((concept) => concept.kind));

// A kind a newer API adds still counts, under «Otros», so the rows add up to
// the total.
function summarize(lines: PayStatementLineDto[]) {
  const groups = [
    ...concepts.map(({ kind, summary, color }) => ({
      key: kind,
      summary,
      color,
      lines: lines.filter((line) => line.kind === kind),
    })),
    {
      key: "other",
      summary: "Otros",
      color: colors.iconQuiet,
      lines: lines.filter((line) => !known.has(line.kind)),
    },
  ];
  return groups.flatMap(({ key, summary, color, lines: matching }) => {
    if (matching.length === 0) return [];
    const centavos = matching.reduce((total, line) => total + line.amountCentavos, 0);
    return [{ key, color, label: `${summary} · ${matching.length}`, centavos }];
  });
}

function AmountRow({
  color,
  label,
  detail,
  centavos,
}: {
  color?: string;
  label: string;
  detail?: string;
  centavos: number;
}) {
  return (
    <View style={styles.row}>
      {color === undefined ? null : <View style={[styles.dot, { backgroundColor: color }]} />}
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail === undefined ? null : <Text style={styles.detail}>{detail}</Text>}
      </View>
      <Text style={styles.amount}>{formatMoney(centavos)}</Text>
    </View>
  );
}

/** The sums by concept, with their share of the total, and «Ver cada clase». */
export function StatementBreakdown({ statement }: { statement: PayStatementDto }) {
  const [open, setOpen] = useState(false);
  const sums = summarize(statement.lines);
  const whole = sums.reduce((total, sum) => total + Math.max(sum.centavos, 0), 0);
  return (
    <>
      {whole <= 0 ? null : (
        <View style={styles.bar}>
          {sums.map((sum) =>
            sum.centavos <= 0 ? null : (
              <View key={sum.key} style={{ backgroundColor: sum.color, flex: sum.centavos }} />
            ),
          )}
        </View>
      )}
      <View style={styles.rows}>
        {sums.map((sum) => (
          <AmountRow centavos={sum.centavos} color={sum.color} key={sum.key} label={sum.label} />
        ))}
      </View>
      {open ? (
        <View style={[styles.rows, styles.lines]}>
          {statement.lines.map((line, index) => (
            // Lines have no identity of their own; their order is the statement's.
            <AmountRow
              centavos={line.amountCentavos}
              detail={line.detail}
              key={index}
              label={lineLabel(line.kind) ?? line.kind}
            />
          ))}
        </View>
      ) : null}
      <CardActionRow
        label={open ? "Ocultar detalle" : "Ver cada clase"}
        onPress={() => setOpen((current) => !current)}
      />
    </>
  );
}

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
  amount: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
  },
  bar: {
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 2,
    height: 8,
    overflow: "hidden",
  },
  detail: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  dot: { borderRadius: 4, height: 8, width: 8 },
  lines: { borderTopColor: colors.hairline, borderTopWidth: 1, paddingTop: spacing.md },
  pressed: { opacity: 0.8 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.smLg,
    justifyContent: "space-between",
  },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  rows: { gap: spacing.sm },
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
