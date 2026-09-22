import {
  getGetCurrentPaymentQueryKey,
  getGetCurrentPurchaseIntentQueryKey,
  getGetTransferQrImageUrl,
  submitPurchaseIntentTransfer,
  useGetCurrentPurchaseIntent,
  useGetTransferInstructions,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  Heading,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { formatBolivianos } from "../plans/plan-format";
import { BackLink } from "@pilates/mobile-core";
import { encodeBase64 } from "@pilates/mobile-core";
import { pickReceipt, uploadReceipt, type AttachedReceipt } from "./receipt-upload";

type PaymentNavigation = {
  goBack: () => void;
  navigate: (screen: "PaymentStatus") => void;
};

const uploadErrorCopy: Record<string, string> = {
  unsupported_media_type: "Elige una imagen JPEG, PNG o WebP.",
  upload_rejected: "No pudimos leer esa imagen. Prueba con otra captura.",
};

// The studio QR is a backend-owned, authenticated image; it is loaded through
// the API fetcher and rendered inline instead of exposing a bucket URL.
function useQrImage(fetcher: typeof globalThis.fetch): string | null {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetcher(getGetTransferQrImageUrl())
      .then(async (response) => {
        if (!response.ok) return;
        const bytes = new Uint8Array(await response.arrayBuffer());
        const type = response.headers.get("Content-Type") ?? "image/png";
        if (active) setUri(`data:${type};base64,${encodeBase64(bytes)}`);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [fetcher]);

  return uri;
}

export function PaymentScreen() {
  const navigation = useNavigation<PaymentNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const intent = useGetCurrentPurchaseIntent({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const instructions = useGetTransferInstructions({ fetcher });
  const qrUri = useQrImage(fetcher);
  const [receipt, setReceipt] = useState<AttachedReceipt | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const header = (
    <>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Pago por transferencia">
        Pago por transferencia
      </Heading>
    </>
  );

  if (intent.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando pago">Cargando…</BodyText>
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
  const details = instructions.data?.status === 200 ? instructions.data.data : null;

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
    setError(null);
    setSubmitting(true);
    try {
      const response = await submitPurchaseIntentTransfer(
        current.id,
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.amountCard}>
          <BodyText>Monto exacto a transferir</BodyText>
          <Text style={styles.amount}>{formatBolivianos(current.amountDueCentavos)}</Text>
          {current.creditReservedCentavos > 0 ? (
            <BodyText style={styles.credit}>
              {`Ya aplicamos ${formatBolivianos(current.creditReservedCentavos)} de tu crédito.`}
            </BodyText>
          ) : null}
        </View>
        <View style={styles.qrCard}>
          {qrUri === null ? (
            <View style={styles.qrPlaceholder} />
          ) : (
            <Image
              accessibilityLabel="Código QR del estudio"
              source={{ uri: qrUri }}
              style={styles.qr}
            />
          )}
          <BodyText style={styles.centered}>
            Escanea el código con tu app bancaria y transfiere el monto exacto.
          </BodyText>
          {details === null ? null : (
            <View style={styles.instructions}>
              <Text style={styles.beneficiary}>{details.beneficiaryName}</Text>
              <BodyText>{`${details.bankName} · Cuenta ${details.accountNumber}`}</BodyText>
            </View>
          )}
        </View>
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
        {error === null ? null : (
          <BodyText accessibilityRole="alert" style={styles.error}>
            {error}
          </BodyText>
        )}
        <PrimaryButton
          disabled={receipt === null || uploading || submitting}
          label="Enviar comprobante"
          onPress={() => void submit()}
        />
      </ScrollView>
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
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  beneficiary: { color: colors.text, fontSize: typography.body, fontWeight: "500" },
  centered: { textAlign: "center" },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  credit: { color: colors.successText },
  error: { color: colors.errorText },
  instructions: { alignItems: "center", gap: spacing.xxs },
  qr: { height: 220, width: 220 },
  qrCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.card,
    gap: spacing.md,
    padding: spacing.lg,
  },
  qrPlaceholder: {
    backgroundColor: colors.divider,
    borderRadius: radii.control,
    height: 220,
    width: 220,
  },
  screen: { gap: spacing.lg },
  thumbnail: { borderRadius: radii.control, height: 120, width: 90 },
  upload: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.card,
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
