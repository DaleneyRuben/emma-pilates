import {
  getGetCurrentPaymentQueryKey,
  getGetCurrentPurchaseIntentQueryKey,
  submitPurchaseIntentTransfer,
  useGetCurrentClientInvoiceData,
  useGetCurrentPurchaseIntent,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  FormScrollView,
  InvoiceDataCard,
  invoiceChoiceFrom,
  invoiceDataPayload,
  type InvoiceChoice,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { formatBolivianos } from "../plans/plan-format";
import { pickReceipt, uploadReceipt, type AttachedReceipt } from "./receipt-upload";
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
  const invoice =
    invoiceEdit ??
    invoiceChoiceFrom(
      lastInvoice.data?.status === 200 ? (lastInvoice.data.data.invoiceData ?? null) : null,
    );
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

  return (
    <Screen style={styles.screen}>
      {header}
      <FormScrollView contentContainerStyle={styles.content}>
        <View style={styles.amountCard}>
          <BodyText>Monto exacto a transferir</BodyText>
          <Text style={styles.amount}>{formatBolivianos(current.amountDueCentavos)}</Text>
          {current.creditReservedCentavos > 0 ? (
            <BodyText style={styles.credit}>
              {`Ya aplicamos ${formatBolivianos(current.creditReservedCentavos)} de tu crédito.`}
            </BodyText>
          ) : null}
        </View>
        <TransferQrCard fetcher={fetcher} />
        <Pressable
          accessibilityLabel={
            receipt === null
              ? "Sube tu comprobante de transferencia"
              : "Comprobante adjunto. Toca para cambiarlo."
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: uploading }}
          disabled={uploading}
          onPress={() => void attach()}
          style={styles.upload}
          testID="payment-receipt"
        >
          {receipt === null ? (
            <>
              <Text style={styles.uploadIcon}>⇪</Text>
              <Text style={styles.uploadLabel}>
                {uploading ? "Subiendo comprobante…" : "Sube tu comprobante de transferencia"}
              </Text>
            </>
          ) : (
            <>
              <Image
                accessibilityLabel="Comprobante adjunto"
                source={{ uri: receipt.localUri }}
                style={styles.thumbnail}
              />
              <Text style={styles.uploadLabel}>Comprobante listo. Toca para cambiarlo.</Text>
            </>
          )}
        </Pressable>
        <InvoiceDataCard
          noInvoiceNote="Tu compra se registra sin datos de factura."
          onChange={setInvoiceEdit}
          prefilledNote="Usamos los datos de tu última compra. Puedes cambiarlos."
          value={invoice}
        />
        {error === null ? null : (
          <BodyText accessibilityRole="alert" style={styles.error}>
            {error}
          </BodyText>
        )}
        <PrimaryButton
          busy={submitting}
          disabled={receipt === null || uploading || invoiceData === "incomplete"}
          label="Enviar comprobante"
          onPress={() => void submit()}
          testID="payment-submit"
        />
      </FormScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.display,
  },
  amountCard: {
    ...surfaces.flatCard,
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.lg,
  },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  credit: { color: colors.successText },
  error: { color: colors.errorText },
  screen: { gap: spacing.lg },
  thumbnail: { borderRadius: radii.control, height: 120, width: 90 },
  upload: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderStyle: "dashed",
    borderWidth: 1.5,
    gap: spacing.sm,
    minHeight: 120,
    justifyContent: "center",
    padding: spacing.lg,
  },
  uploadIcon: { color: colors.primaryDeep, fontSize: typography.titleSecondary },
  uploadLabel: { color: colors.primaryDeep, fontSize: typography.body, textAlign: "center" },
});
