import {
  getGetCurrentPaymentQueryKey,
  getGetCurrentPurchaseIntentQueryKey,
  submitPurchaseIntentTransfer,
  useGetCurrentClientInvoiceData,
  useGetCurrentPurchaseIntent,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  colors,
  EmphasisCard,
  footerEdges,
  FooterPanel,
  FormScrollView,
  Glyph,
  InlineError,
  invoiceChoiceFrom,
  invoiceDataPayload,
  invoiceIncompleteNote,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  SectionTitle,
  spacing,
  surfaces,
  TabletColumn,
  TabletColumns,
  Text,
  type InvoiceChoice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { formatCivilDate } from "../home/home-format";
import { formatBolivianos } from "../plans/plan-format";
import { pickReceipt, uploadReceipt, type AttachedReceipt } from "./receipt-upload";
import { InvoiceDisclosure } from "./invoice-disclosure";
import { ReceiptRow } from "./receipt-row";
import { TransferQrCard } from "./transfer-qr-card";

type PaymentNavigation = {
  goBack: () => void;
  navigate: (screen: "PaymentStatus") => void;
};

const uploadErrorCopy: Record<string, string> = {
  unsupported_media_type: "Elige una imagen JPEG, PNG o WebP.",
  upload_rejected: "No pudimos leer esa imagen. Prueba con otra captura.",
};

export function PaymentScreen() {
  const navigation = useNavigation<PaymentNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const intent = useGetCurrentPurchaseIntent({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  // PAY-007: prefilled from her last sale; a failed read leaves «Sin factura».
  const lastInvoice = useGetCurrentClientInvoiceData({ fetcher });
  const [invoiceEdit, setInvoiceEdit] = useState<InvoiceChoice | null>(null);
  // Walkthrough n.º 14: closed by default, so the purchase goes without an
  // invoice; opening it shows her last sale's data.
  const invoice = invoiceEdit ?? {
    ...invoiceChoiceFrom(
      lastInvoice.data?.status === 200 ? (lastInvoice.data.data.invoiceData ?? null) : null,
    ),
    wantsInvoice: false,
  };
  const invoiceData = invoiceDataPayload(invoice);
  const [receipt, setReceipt] = useState<AttachedReceipt | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offReason =
    receipt === null
      ? "Adjunta tu comprobante para continuar"
      : invoiceData === "incomplete"
        ? (invoiceIncompleteNote(invoice) ?? undefined)
        : undefined;

  const header = (
    <>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Pago por transferencia" />
    </>
  );

  if (intent.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando pago" />
      </Screen>
    );
  }
  if (intent.isError || intent.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No encontramos un pago pendiente."
          onRetry={() => void intent.refetch()}
        />
      </Screen>
    );
  }

  const current = intent.data.data;

  const attach = async () => {
    setError(null);
    try {
      const picked = await pickReceipt();
      if (picked === null) return;
      setUploading(true);
      setReceipt(await uploadReceipt(picked, current.id, fetcher));
    } catch (failure) {
      if (__DEV__) console.warn("receipt upload failed", failure);
      const code = failure instanceof Error ? failure.message : "";
      setError(uploadErrorCopy[code] ?? "No pudimos subir el comprobante. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (invoiceData === "incomplete") return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await submitPurchaseIntentTransfer(
        current.id,
        { invoiceData },
        { headers: { "idempotency-key": randomUUID() } },
        fetcher,
      );
      if (response.status !== 201) throw new Error("submit_failed");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetCurrentPaymentQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetCurrentPurchaseIntentQueryKey() }),
      ]);
      navigation.navigate("PaymentStatus");
    } catch {
      setError("No pudimos enviar el comprobante. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const startsLine =
    current.startsOn === undefined
      ? ""
      : current.startsOn === boliviaCivilDate(new Date())
        ? " · empieza hoy"
        : ` · empieza el ${formatCivilDate(current.startsOn)}`;

  return (
    <Screen edges={footerEdges} style={styles.screen}>
      {header}
      <FormScrollView contentContainerStyle={styles.content}>
        <EmphasisCard
          eyebrow="Monto exacto a transferir"
          note={`Plan ${current.planName}${startsLine}`}
          testID="payment-hero"
        >
          <Text tone="onDark" variant="cifra-grande">
            {formatBolivianos(current.amountDueCentavos)}
          </Text>
        </EmphasisCard>
        {/* 10T: the QR beside the receipt and the invoice. */}
        <TabletColumns
          left={
            <View>
              <SectionTitle>1 · Paga con el QR del estudio</SectionTitle>
              <TransferQrCard fetcher={fetcher} />
            </View>
          }
          right={
            <View>
              <SectionTitle>2 · Sube tu comprobante</SectionTitle>
              <View style={styles.group}>
                <ReceiptRow
                  onAttach={() => void attach()}
                  onRemove={() => setReceipt(null)}
                  receipt={receipt}
                  uploading={uploading}
                />
                <View style={styles.hairline} />
                <InvoiceDisclosure onChange={setInvoiceEdit} value={invoice} />
              </View>
            </View>
          }
        />
        {error === null ? null : (
          <View style={styles.errorBox}>
            <Glyph color={colors.errorText} name="alert" size={18} strokeWidth={1.7} />
            <InlineError style={styles.error}>{error}</InlineError>
          </View>
        )}
      </FormScrollView>
      {/* Rosa Emma C10: the button and its line on a white panel cast upward. */}
      <FooterPanel testID="payment-footer">
        <TabletColumn gap={spacing.sm} width={480}>
          {offReason === undefined ? (
            <Text style={styles.note} variant="secundario">
              El estudio revisa tu pago y te avisa por la app
            </Text>
          ) : null}
          <PrimaryButton
            busy={submitting}
            disabled={receipt === null || uploading || invoiceData === "incomplete"}
            // FIX-089: the reason is the off button's own line, under it.
            disabledReason={offReason}
            label="Enviar comprobante"
            onPress={() => void submit()}
            testID="payment-submit"
          />
        </TabletColumn>
      </FooterPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.lg },
  error: { flex: 1 },
  // Rosa Emma C10e: a failure on 50 with its outline and glyph.
  errorBox: {
    alignItems: "flex-start",
    backgroundColor: colors.errorSurface,
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  group: { ...surfaces.card, overflow: "hidden" },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  note: { textAlign: "center" },
  screen: { gap: spacing.lg, paddingBottom: 0 },
});
