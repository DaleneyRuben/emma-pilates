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
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { randomUUID } from "expo-crypto";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { RowCard } from "../ui/card-pieces";
import { ValueRow } from "../ui/value-row";
import { CashCloseFrame } from "./cash-close-frame";
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
 * the expected cash and the difference appear under it only once she has
 * typed her count (FIX-090), and closing asks once more because a close
 * cannot be undone. E-S05: each part on its white card, the button and its
 * reminder in the white footer.
 */
export function CashCloseForm({
  branch,
  cashPaymentCount,
  expectedCentavos,
  fetcher,
  lead,
  onClosed,
  root,
  voidedCashCentavos,
}: {
  branch: { id: string; name: string };
  cashPaymentCount: number;
  expectedCentavos: number;
  fetcher: typeof globalThis.fetch;
  /** What leads the body, such as the Branch chips. */
  lead?: ReactNode;
  onClosed: (close: CashCloseDto | null, failure: string | null) => Promise<void>;
  root: boolean;
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

  const footer = (
    <>
      <PrimaryButton
        disabled={countedCentavos === null}
        label="Cerrar caja"
        onPress={() => setConfirming(true)}
        testID="cash-close-submit"
      />
      <Text style={[styles.quiet, styles.centered]}>
        Te pediremos confirmar: un cierre no se puede deshacer.
      </Text>
    </>
  );

  return (
    <CashCloseFrame footer={footer} root={root}>
      {lead}
      <View style={styles.card}>
        <Text style={styles.question}>{question}</Text>
        <View style={[styles.amount, (focused || counted !== "") && styles.amountFocused]}>
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
      {/* FIX-090: what the payments expect only reads once she has counted. */}
      {countedCentavos === null || difference === null || differenceCentavos === null ? null : (
        <RowCard>
          <View
            accessibilityLabel={`Esperado según los pagos, ${formatMoney(expectedCentavos)}`}
            accessible
          >
            <ValueRow label="Esperado según los pagos" value={formatMoney(expectedCentavos)} />
          </View>
          {voidedCashCentavos > 0 ? (
            <View
              accessibilityLabel={`Ventas anuladas (efectivo en caja), ${formatMoney(voidedCashCentavos)}`}
              accessible
            >
              <ValueRow
                label="Ventas anuladas (efectivo en caja)"
                value={formatMoney(voidedCashCentavos)}
              />
            </View>
          ) : null}
          <View
            accessibilityLabel={`Diferencia · ${formatSignedBolivianos(differenceCentavos)} · ${difference.label}`}
            accessible
          >
            <ValueRow
              label="Diferencia"
              value={
                <Text style={[styles.differenceValue, { color: difference.text }]}>
                  {differenceValue(differenceCentavos)}
                </Text>
              }
            />
          </View>
        </RowCard>
      )}
      <View style={styles.card}>
        <Text style={styles.sales}>{describeCashSales(cashPaymentCount, branch.name)}</Text>
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
      </View>
      {failure === null ? null : (
        <View accessibilityLabel={failure} accessibilityRole="alert">
          <NoticeRow message={failure} />
        </View>
      )}
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
    </CashCloseFrame>
  );
}

const styles = StyleSheet.create({
  amount: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: radii.button,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.md,
    height: 88,
    paddingHorizontal: spacing.lgXl,
  },
  amountFocused: { borderColor: colors.primary, borderWidth: 2 },
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  centered: { textAlign: "center" },
  currency: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.bodyLarge,
    fontWeight: "700",
  },
  differenceValue: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.display,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
    padding: 0,
  },
  note: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: "top" },
  question: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.bodyMedium,
    fontWeight: "700",
  },
  quiet: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  sales: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
});
