import {
  useGetPaymentReview,
  formatMoney,
  formatListDate,
  formatDateTime,
} from "@pilates/api-contracts";
import {
  ClientFace,
  colors,
  EmphasisCard,
  fontFamilies,
  FormField,
  FormScrollView,
  FullScreenImage,
  IconRow,
  IconRowGroup,
  boliviaCivilDate,
  LoadingState,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  surfaces,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { bodyScroll, CardLabel, FooterPanel, RowCard, taskEdges } from "../ui/card-pieces";
import { BackBar } from "../ui/back-bar";
import { PersonRow } from "../ui/person-row";

import { useStaffFetcher } from "../staff-fetcher";
import { createAdministratorApi } from "./administrator-api";
import { describeSale } from "./administrator-format";
import { PaymentBreakdown } from "./payment-breakdown";
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
  // FIX-052 (n.º 47): a Plan that starts later, above all her next Plan
  // queued after the current one, says when, like S10's «Empieza» (FIX-050).
  // A rejected or voided sale never starts, and an Evaluation is no Plan.
  const startsLater =
    (payment.state === "pending" || payment.state === "confirmed") &&
    payment.kind !== "evaluation" &&
    payment.startsOn !== undefined &&
    payment.startsOn > boliviaCivilDate(new Date())
      ? formatListDate(payment.startsOn)
      : null;
  const nextPlan = startsLater !== null && payment.nextPlan === true;
  const confirmedNotice: PaymentsNotice =
    startsLater === null
      ? "Pago confirmado"
      : nextPlan
        ? `Plan siguiente programado desde el ${startsLater}`
        : `Plan programado desde el ${startsLater}`;

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

  // S12 «Rechazar» (E-D05): who, the reason she will read, and what happens.
  if (payment.state === "pending" && rejecting) {
    return (
      <Screen edges={taskEdges} style={[styles.screen, bodyScroll.taskScreen]}>
        {header}
        <View style={bodyScroll.clip}>
          <FormScrollView
            contentContainerStyle={bodyScroll.content}
            footer={
              <FooterPanel bleed={0}>
                {failureRow}
                <PrimaryButton
                  busy={submitting}
                  disabled={trimmedReason === ""}
                  label="Confirmar rechazo"
                  onPress={() =>
                    void decide(
                      () => api.rejectPayment(payment.id, trimmedReason),
                      "Pago rechazado",
                    )
                  }
                  testID="review-reject-confirm"
                  tone="error"
                />
                <TextButton label="Volver" onPress={() => setRejecting(false)} />
              </FooterPanel>
            }
          >
            <RowCard>
              <PersonRow
                amount={formatMoney(payment.amountDueCentavos)}
                detail={describeSale(payment)}
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
            </RowCard>
            <View style={styles.formCard}>
              <FormField
                label="Motivo del rechazo"
                multiline
                onChangeText={setReason}
                hint="Ej.: El monto no coincide con la transferencia recibida."
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
        </View>
      </Screen>
    );
  }

  const pending = payment.state === "pending";
  return (
    <Screen
      edges={pending ? taskEdges : undefined}
      style={[styles.screen, pending && bodyScroll.taskScreen]}
    >
      {header}
      <View style={bodyScroll.clip}>
        <FormScrollView
          contentContainerStyle={bodyScroll.content}
          footer={
            !pending ? undefined : (
              <FooterPanel bleed={0}>
                {failureRow}
                {invoiceData === null ? null : (
                  <Text style={styles.invoiceNote}>
                    Podrás subir la factura cuando confirmes el pago.
                  </Text>
                )}
                <PrimaryButton
                  busy={submitting}
                  disabled={receiptUri === null}
                  label="Confirmar pago"
                  onPress={() => void decide(() => api.confirmPayment(payment.id), confirmedNotice)}
                  testID="review-confirm"
                />
                <TextButton
                  label="Rechazar"
                  onPress={() => setRejecting(true)}
                  testID="review-reject"
                  tone="error"
                />
              </FooterPanel>
            )
          }
        >
          {/* E-D04: the amount is the screen's one 600 hero, its state at the eyebrow's end. */}
          <EmphasisCard>
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>Monto a verificar</Text>
              <Text style={styles.state}>{stateLabels[payment.state]}</Text>
            </View>
            <Text style={styles.amount}>{formatMoney(payment.amountDueCentavos)}</Text>
            <Text
              style={styles.heroNote}
            >{`${payment.clientName} · ${describeSale(payment)}`}</Text>
          </EmphasisCard>
          <PaymentBreakdown payment={payment} />
          <IconRowGroup>
            <IconRow icon="credit" label="Transferencia" />
            <IconRow icon="clock" label={`Enviado el ${formatDateTime(payment.submittedAt)}`} />
            {startsLater === null ? null : nextPlan ? (
              <IconRow icon="calendar" label="Plan siguiente" value={`Empieza el ${startsLater}`} />
            ) : (
              <IconRow icon="calendar" label="Empieza" value={startsLater} />
            )}
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
          <View style={styles.receiptCard}>
            <View style={styles.receiptTop}>
              <View style={styles.receiptLabel}>
                <CardLabel>Comprobante</CardLabel>
              </View>
              {receiptUri === null ? null : (
                <Pressable
                  accessibilityLabel="Ampliar"
                  accessibilityRole="button"
                  hitSlop={spacing.md}
                  onPress={() => setEnlarged(true)}
                >
                  <Text style={styles.enlarge}>Ampliar</Text>
                </Pressable>
              )}
            </View>
            {receiptView}
          </View>
        </FormScrollView>
      </View>
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

const heroText = { color: colors.onEmphasis } as const;

const styles = StyleSheet.create({
  amount: {
    ...heroText,
    fontFamily: fontFamilies.display,
    fontSize: 36,
    fontVariant: ["tabular-nums"],
    lineHeight: 42,
  },
  enlarge: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  formCard: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  helper: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  heroLabel: {
    ...heroText,
    flex: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
    letterSpacing: typography.label * 0.14,
    textTransform: "uppercase",
  },
  heroNote: { ...heroText, fontFamily: fontFamilies.body, fontSize: typography.body },
  heroTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  invoiceNote: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    textAlign: "center",
  },
  reasonInput: { minHeight: 96, textAlignVertical: "top" },
  receipt: { borderRadius: radii.inset, width: "100%" },
  receiptCard: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  receiptLabel: { flex: 1 },
  receiptTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  screen: { paddingHorizontal: spacing.xlSm },
  // FIX-089: the state is a word in weight on the hero, not a pill.
  state: {
    ...heroText,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontWeight: "700",
  },
});
