import {
  getGetCurrentPaymentQueryKey,
  getGetCurrentPurchaseIntentQueryKey,
  submitPurchaseIntentTransfer,
  useGetCurrentClientInvoiceData,
  useGetCurrentPurchaseIntent,
} from "@pilates/api-contracts";
import {
  BodyText,
  boliviaCivilDate,
  colors,
  EmphasisCard,
  fontFamilies,
  FormScrollView,
  invoiceChoiceFrom,
  invoiceDataPayload,
  invoiceIncompleteNote,
  type InvoiceChoice,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenTopBar,
  SectionTitle,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

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
    <Screen style={styles.screen}>
      {header}
      <FormScrollView contentContainerStyle={styles.content}>
        <EmphasisCard
          eyebrow="Monto exacto a transferir"
          note={`Plan ${current.planName}${startsLine}`}
          testID="payment-hero"
        >
          <Text style={styles.amount}>{formatBolivianos(current.amountDueCentavos)}</Text>
        </EmphasisCard>
        <View>
          <SectionTitle>1 · Paga con el QR del estudio</SectionTitle>
          <TransferQrCard fetcher={fetcher} />
        </View>
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
        {error === null ? null : (
          <BodyText accessibilityRole="alert" style={styles.error}>
            {error}
          </BodyText>
        )}
      </FormScrollView>
      <View style={styles.footer}>
        <BodyText style={styles.note}>
          {receipt === null
            ? "Adjunta tu comprobante para continuar"
            : invoiceData === "incomplete"
              ? (invoiceIncompleteNote(invoice) ?? "")
              : "El estudio revisa tu pago y te avisa por la app"}
        </BodyText>
        <PrimaryButton
          busy={submitting}
          disabled={receipt === null || uploading || invoiceData === "incomplete"}
          label="Enviar comprobante"
          onPress={() => void submit()}
          testID="payment-submit"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.white,
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
  },
  content: { gap: spacing.xl, paddingBottom: spacing.lg },
  error: { color: colors.errorText },
  footer: { gap: spacing.sm, paddingBottom: spacing.sm, paddingTop: spacing.sm },
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: 64 },
  note: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
  screen: { gap: spacing.lg },
});
