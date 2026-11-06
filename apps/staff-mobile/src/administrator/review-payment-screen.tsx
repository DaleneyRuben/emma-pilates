import { useGetPaymentReview } from "@pilates/api-contracts";
import {
  CardActionRow,
  cardWithActionRow,
  ClientFace,
  colors,
  EmphasisCard,
  fontFamilies,
  formatBolivianos,
  FormField,
  FormScrollView,
  FullScreenImage,
  IconRow,
  IconRowGroup,
  LoadingState,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  SectionTitle,
  spacing,
  surfaces,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { BackBar } from "../ui/back-bar";
import { PersonRow } from "../ui/person-row";

import { useStaffFetcher } from "../staff-fetcher";
import { createAdministratorApi } from "./administrator-api";
import { formatSubmittedAt } from "./administrator-format";
import type { PaymentsNotice } from "./pending-payments-screen";

type ReviewNavigation = {
  goBack: () => void;
  navigate: (screen: "Payments", params: { notice: PaymentsNotice }) => void;
};

const stateLabels = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  rejected: "Rechazado",
  voided: "Anulado",
} as const;

export function ReviewPaymentScreen({ route }: { route: { params: { paymentId: string } } }) {
  const navigation = useNavigation<ReviewNavigation>();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createAdministratorApi(fetcher), [fetcher]);
  const review = useGetPaymentReview(route.params.paymentId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const receiptUrl = review.data?.status === 200 ? (review.data.data.receiptUrl ?? null) : null;
  const receipt = useQuery({
    queryKey: ["payment-receipt", route.params.paymentId, receiptUrl],
    queryFn: async () => {
      const loaded = await api.loadReceipt(receiptUrl ?? "");
      if (loaded === null) {
        throw new Error("The receipt could not be loaded");
      }
      return loaded;
    },
    enabled: receiptUrl !== null,
  });
  const receiptUri = receipt.data?.uri ?? null;
  const receiptRatio = receipt.data?.aspectRatio ?? 1;
  const [enlarged, setEnlarged] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const header = <BackBar onBack={() => navigation.goBack()} title="Revisar pago" />;

  if (review.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando pago" />
      </Screen>
    );
  }
  if (review.isError || review.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar el pago." onRetry={() => void review.refetch()} />
      </Screen>
    );
  }

  const payment = review.data.data;
  // FIX-044: whether she asked for an invoice, and in whose name (n.º 24).
  const invoiceData = payment.invoiceData ?? null;
  const trimmedReason = reason.trim();

  const decide = async (decision: () => Promise<unknown>, notice: PaymentsNotice) => {
    setSubmitting(true);
    setFailure(null);
    try {
      await decision();
      await queryClient.invalidateQueries();
      navigation.navigate("Payments", { notice });
    } catch {
      setFailure("No pudimos registrar la decisión. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  };

  const receiptView =
    receiptUri === null ? (
      receipt.isError ? (
        <QueryFailure
          label="No pudimos mostrar el comprobante."
          onRetry={() => void receipt.refetch()}
        />
      ) : (
        <Text style={styles.helper}>
          {payment.receipt ? "Cargando el comprobante…" : "Todavía no hay comprobante."}
        </Text>
      )
    ) : (
      <Pressable
        accessibilityLabel="Ampliar comprobante"
        accessibilityRole="imagebutton"
        onPress={() => setEnlarged(true)}
      >
        <Image
          accessibilityLabel="Comprobante de transferencia"
          resizeMode="contain"
          source={{ uri: receiptUri }}
          style={[styles.receipt, { aspectRatio: receiptRatio }]}
        />
      </Pressable>
    );
  const failureRow =
    failure === null ? null : (
      <View accessibilityLabel={failure} accessibilityRole="alert">
        <NoticeRow message={failure} />
      </View>
    );

  // S12 «Rechazar»: who, the reason she will read, and what happens.
  if (payment.state === "pending" && rejecting) {
    return (
      <Screen style={styles.screen}>
        <FormScrollView
          contentContainerStyle={styles.content}
          footer={
            <View style={styles.actions}>
              {failureRow}
              <PrimaryButton
                busy={submitting}
                disabled={trimmedReason === ""}
                label="Confirmar rechazo"
                onPress={() =>
                  void decide(() => api.rejectPayment(payment.id, trimmedReason), "Pago rechazado")
                }
                testID="review-reject-confirm"
                tone="error"
              />
              <TextButton label="Volver" onPress={() => setRejecting(false)} />
            </View>
          }
        >
          {header}
          <IconRowGroup>
            <PersonRow
              amount={formatBolivianos(payment.amountDueCentavos)}
              detail={payment.planName}
              face={
                <ClientFace
                  fetcher={fetcher}
                  name={payment.clientName}
                  photo={payment.clientPhoto}
                  size={36}
                />
              }
              name={payment.clientName}
            />
          </IconRowGroup>
          <View style={styles.field}>
            <FormField
              label="Motivo del rechazo"
              multiline
              onChangeText={setReason}
              placeholder="Ej.: El monto no coincide con la transferencia recibida."
              style={styles.reasonInput}
              testID="review-reject-reason"
              value={reason}
            />
            <Text style={styles.helper}>
              La clienta verá este mensaje para corregir y volver a enviar.
            </Text>
          </View>
          <NoticeRow message="El plan no se activa hasta que envíe un comprobante válido." />
        </FormScrollView>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <FormScrollView
        contentContainerStyle={styles.content}
        footer={
          payment.state !== "pending" ? undefined : (
            <View style={styles.actions}>
              {failureRow}
              <PrimaryButton
                busy={submitting}
                disabled={receiptUri === null}
                label="Confirmar pago"
                onPress={() => void decide(() => api.confirmPayment(payment.id), "Pago confirmado")}
                testID="review-confirm"
              />
              <TextButton
                label="Rechazar"
                onPress={() => setRejecting(true)}
                testID="review-reject"
                tone="error"
              />
            </View>
          )
        }
      >
        {header}
        <EmphasisCard
          eyebrow="Monto a verificar"
          note={`${payment.clientName} · ${payment.planName}`}
          pill={stateLabels[payment.state]}
        >
          <Text style={styles.amount}>{formatBolivianos(payment.amountDueCentavos)}</Text>
        </EmphasisCard>
        <IconRowGroup>
          <IconRow icon="credit" label="Transferencia" />
          <IconRow icon="clock" label={`Enviado el ${formatSubmittedAt(payment.submittedAt)}`} />
          {invoiceData === null ? (
            <IconRow icon="receipt" label="Sin factura" value="No la pidió" />
          ) : (
            <IconRow
              icon="receipt"
              label="Factura"
              value={`NIT ${invoiceData.taxId} · ${invoiceData.name}`}
            />
          )}
        </IconRowGroup>
        {invoiceData === null || payment.state !== "pending" ? null : (
          <Text style={styles.invoiceNote}>Podrás subir la factura cuando confirmes el pago.</Text>
        )}
        <View style={[styles.receiptCard, receiptUri === null ? null : cardWithActionRow]}>
          <SectionTitle>Comprobante</SectionTitle>
          {receiptView}
          {receiptUri === null ? null : (
            <CardActionRow label="Ampliar" onPress={() => setEnlarged(true)} />
          )}
        </View>
      </FormScrollView>
      <FullScreenImage
        aspectRatio={receiptRatio}
        label="Comprobante ampliado"
        onClose={() => setEnlarged(false)}
        uri={receiptUri}
        visible={enlarged}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.xs, paddingTop: spacing.md },
  amount: {
    color: colors.white,
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
  },
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  field: { gap: spacing.xs },
  helper: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  invoiceNote: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    marginTop: -spacing.md,
    paddingHorizontal: spacing.xs,
  },
  reasonInput: { minHeight: 96, textAlignVertical: "top" },
  receipt: { borderRadius: radii.inset, width: "100%" },
  receiptCard: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  screen: { paddingHorizontal: spacing.xlSm },
});
