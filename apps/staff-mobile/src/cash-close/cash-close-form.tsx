import { recordCashClose, type CashCloseDto, formatMoney } from "@pilates/api-contracts";
import {
  colors,
  ConfirmationSheet,
  fontFamilies,
  FormField,
  NoticeRow,
  PrimaryButton,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { PlainRow, PlainRowGroup } from "../ui/plain-rows";
import {
  cashCloseFailure,
  cashCloseProblems,
  describeCashSales,
  describeDifference,
  differenceValue,
  formatSignedBolivianos,
  parseCountedCentavos,
} from "./cash-close-format";

const question = "¿Cuánto efectivo hay en la caja?";

const problemCode = (body: unknown): string | null => {
  const code = (body as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : null;
};

/** One close at a time per Branch, with the key that lets a lost response replay. */
export function useRecordCashClose(
  branchId: string,
  fetcher: typeof globalThis.fetch,
  onClosed: (close: CashCloseDto | null, failure: string | null) => Promise<void>,
) {
  const [idempotencyKey] = useState(() => randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const record = async (countedCentavos: number, note: string | null) => {
    setSubmitting(true);
    setFailure(null);
    try {
      const response = await recordCashClose(
        { branchId, countedCentavos, note },
        { headers: { "idempotency-key": idempotencyKey } },
        fetcher,
      );
      if (response.status === 201) {
        await onClosed(response.data, null);
        return;
      }
      const code = problemCode(response.data);
      const message = (code === null ? undefined : cashCloseProblems[code]) ?? cashCloseFailure;
      setFailure(message);
      if (code === "cash_close_already_recorded") await onClosed(null, message);
    } catch {
      setFailure(cashCloseFailure);
    } finally {
      setSubmitting(false);
    }
  };
  return { failure, record, submitting };
}

/**
 * FIX-083 (Cerrar caja pick A): she counts first, in one large amount field;
 * the expected cash and the difference sit quietly under it, and closing asks
 * once more because a close cannot be undone.
 */
export function CashCloseForm({
  branch,
  cashPaymentCount,
  expectedCentavos,
  fetcher,
  onClosed,
  voidedCashCentavos,
}: {
  branch: { id: string; name: string };
  cashPaymentCount: number;
  expectedCentavos: number;
  fetcher: typeof globalThis.fetch;
  onClosed: (close: CashCloseDto | null, failure: string | null) => Promise<void>;
  voidedCashCentavos: number;
}) {
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [focused, setFocused] = useState(false);
  const { failure, record, submitting } = useRecordCashClose(branch.id, fetcher, onClosed);
  const countedCentavos = parseCountedCentavos(counted);
  const differenceCentavos = countedCentavos === null ? null : countedCentavos - expectedCentavos;
  const difference = differenceCentavos === null ? null : describeDifference(differenceCentavos);

  const close = async () => {
    if (countedCentavos === null) return;
    await record(
      countedCentavos,
      differenceCentavos === 0 || note.trim() === "" ? null : note.trim(),
    );
    setConfirming(false);
  };

  return (
    <>
      <View style={styles.count}>
        <Text style={styles.question}>{question}</Text>
        <View style={[styles.amount, focused && styles.amountFocused]}>
          <Text style={styles.currency}>Bs</Text>
          <TextInput
            accessibilityLabel={question}
            keyboardType="decimal-pad"
            onBlur={() => setFocused(false)}
            onChangeText={setCounted}
            onFocus={() => setFocused(true)}
            placeholder="0"
            placeholderTextColor={colors.iconQuiet}
            style={styles.input}
            testID="cash-close-counted"
            value={counted}
          />
        </View>
        <Text style={styles.quiet}>Cuenta los billetes antes de mirar el total esperado.</Text>
      </View>
      <PlainRowGroup>
        <PlainRow label="Esperado según los pagos" value={formatMoney(expectedCentavos)} />
        {voidedCashCentavos > 0 ? (
          <PlainRow
            label="Ventas anuladas (efectivo en caja)"
            value={formatMoney(voidedCashCentavos)}
          />
        ) : null}
        <View
          accessibilityLabel={
            difference === null || differenceCentavos === null
              ? "Diferencia, sin contar todavía"
              : `Diferencia · ${formatSignedBolivianos(differenceCentavos)} · ${difference.label}`
          }
          accessible
          style={styles.differenceRow}
        >
          <Text style={styles.differenceLabel}>Diferencia</Text>
          <Text style={[styles.differenceValue, difference && { color: difference.text }]}>
            {differenceCentavos === null ? "—" : differenceValue(differenceCentavos)}
          </Text>
        </View>
      </PlainRowGroup>
      <Text style={styles.quiet}>{describeCashSales(cashPaymentCount, branch.name)}</Text>
      {differenceCentavos === null || differenceCentavos === 0 ? null : (
        <FormField
          label="Nota"
          optional
          maxLength={500}
          multiline
          numberOfLines={3}
          onChangeText={setNote}
          hint="Ej.: faltó cambio para un billete de 200"
          style={styles.note}
          testID="cash-close-note"
          value={note}
        />
      )}
      {failure === null ? null : (
        <View accessibilityLabel={failure} accessibilityRole="alert">
          <NoticeRow message={failure} />
        </View>
      )}
      <View style={styles.footer}>
        <PrimaryButton
          disabled={countedCentavos === null}
          label="Cerrar caja"
          onPress={() => setConfirming(true)}
          testID="cash-close-submit"
        />
        <Text style={[styles.quiet, styles.centered]}>
          Te pediremos confirmar: un cierre no se puede deshacer.
        </Text>
      </View>
      <ConfirmationSheet
        busy={submitting}
        confirmLabel="Cerrar caja"
        confirmTestID="cash-close-confirm"
        note={
          countedCentavos === null || difference === null
            ? undefined
            : `Contaste ${formatMoney(countedCentavos)} en ${branch.name} (${difference.label.toLowerCase()}). Un cierre no se puede deshacer.`
        }
        onConfirm={() => void close()}
        onDismiss={() => setConfirming(false)}
        title="¿Cerrar la caja de hoy?"
        tone="primary"
        visible={confirming}
      />
    </>
  );
}

const styles = StyleSheet.create({
  amount: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 64,
    paddingHorizontal: spacing.lg,
  },
  amountFocused: { borderColor: colors.primary, borderWidth: 2 },
  centered: { textAlign: "center" },
  count: { gap: spacing.sm },
  currency: {
    color: colors.textSubtle,
    fontFamily: fontFamilies.body,
    fontSize: typography.titleCard,
  },
  differenceLabel: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
  },
  differenceRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  differenceValue: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
  },
  footer: { gap: spacing.sm },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.display,
    fontSize: typography.title,
    fontVariant: ["tabular-nums"],
    padding: 0,
  },
  note: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: "top" },
  question: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: typography.body },
  quiet: { color: colors.textSubtle, fontFamily: fontFamilies.body, fontSize: typography.note },
});
