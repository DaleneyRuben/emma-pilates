import { useGetPaymentReview } from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  formatBolivianos,
  FormField,
  Heading,
  initials,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
} as const;

export function ReviewPaymentScreen({
  route,
}: {
  route: { params: { paymentId: string } };
}) {
  const navigation = useNavigation<ReviewNavigation>();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createAdministratorApi(fetcher), [fetcher]);
  const review = useGetPaymentReview(route.params.paymentId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const receiptUrl =
    review.data?.status === 200 ? (review.data.data.receiptUrl ?? null) : null;
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [enlarged, setEnlarged] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (receiptUrl === null) return;
    let active = true;
    void api
      .loadReceipt(receiptUrl)
      .then((uri) => {
        if (active) setReceiptUri(uri);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api, receiptUrl]);

  const header = <BackLink onPress={() => navigation.goBack()} />;

  if (review.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando pago">Cargando…</BodyText>
      </Screen>
    );
  }
  if (review.isError || review.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar el pago."
          onRetry={() => void review.refetch()}
        />
      </Screen>
    );
  }

  const payment = review.data.data;
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

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.client}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(payment.clientName)}</Text>
          </View>
          <View style={styles.clientBody}>
            <Text style={styles.name}>{payment.clientName}</Text>
            <BodyText>{payment.planName}</BodyText>
          </View>
        </View>
        <View style={styles.amountCard}>
          <BodyText style={styles.amountLabel}>Monto a verificar</BodyText>
          <Text style={styles.amount}>{formatBolivianos(payment.amountDueCentavos)}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stateLabels[payment.state]}</Text>
          </View>
          <BodyText style={styles.meta}>
            {`Transferencia · enviado el ${formatSubmittedAt(payment.submittedAt)}`}
          </BodyText>
        </View>
        <View style={styles.receiptSection}>
          <View style={styles.receiptHeader}>
            <Text style={styles.sectionTitle}>Comprobante</Text>
            {receiptUri === null ? null : (
              <TextButton label="Ampliar" onPress={() => setEnlarged(true)} />
            )}
          </View>
          {receiptUri === null ? (
            <BodyText>
              {payment.receipt
                ? "Cargando el comprobante…"
                : "El comprobante ya no está disponible."}
            </BodyText>
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
                style={styles.receipt}
              />
            </Pressable>
          )}
        </View>
        {failure === null ? null : (
          <BodyText accessibilityRole="alert" style={styles.failure}>
            {failure}
          </BodyText>
        )}
        {payment.state !== "pending" ? null : rejecting ? (
          <View style={styles.rejectForm}>
            <FormField
              label="Motivo del rechazo"
              multiline
              onChangeText={setReason}
              placeholder="Ej.: El monto no coincide con la transferencia recibida."
              style={styles.reasonInput}
              value={reason}
            />
            <BodyText style={styles.helper}>
              La clienta verá este mensaje para corregir y volver a enviar.
            </BodyText>
            <Pressable
              accessibilityLabel="Confirmar rechazo"
              accessibilityRole="button"
              accessibilityState={{ disabled: trimmedReason === "" || submitting }}
              disabled={trimmedReason === "" || submitting}
              onPress={() =>
                void decide(
                  () => api.rejectPayment(payment.id, trimmedReason),
                  "Pago rechazado",
                )
              }
              style={[
                styles.destructive,
                (trimmedReason === "" || submitting) && styles.destructiveDisabled,
              ]}
            >
              <Text style={styles.destructiveLabel}>Confirmar rechazo</Text>
            </Pressable>
            <TextButton label="Cancelar" onPress={() => setRejecting(false)} />
          </View>
        ) : (
          <View style={styles.actions}>
            <PrimaryButton
              disabled={submitting}
              label="Confirmar pago"
              onPress={() =>
                void decide(() => api.confirmPayment(payment.id), "Pago confirmado")
              }
            />
            <Pressable
              accessibilityLabel="Rechazar"
              accessibilityRole="button"
              onPress={() => setRejecting(true)}
              style={styles.reject}
            >
              <Text style={styles.rejectLabel}>Rechazar</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <Modal
        animationType="fade"
        onRequestClose={() => setEnlarged(false)}
        visible={enlarged && receiptUri !== null}
      >
        <SafeAreaProvider>
          <SafeAreaView style={styles.viewer}>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              hitSlop={spacing.md}
              onPress={() => setEnlarged(false)}
              style={styles.close}
            >
              <Text style={styles.closeLabel}>✕</Text>
            </Pressable>
            <ScrollView
              contentContainerStyle={styles.viewerContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
            >
              {receiptUri === null ? null : (
                <Image
                  accessibilityLabel="Comprobante ampliado"
                  resizeMode="contain"
                  source={{ uri: receiptUri }}
                  style={styles.enlarged}
                />
              )}
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
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
  amountLabel: {
    color: colors.textMuted,
    fontSize: typography.note,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarText: { color: colors.primaryDeep, fontSize: typography.body, fontWeight: "600" },
  badge: {
    backgroundColor: "rgba(201, 154, 78, 0.16)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
  badgeText: { color: colors.warningText, fontSize: typography.note, fontWeight: "500" },
  client: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  clientBody: { flex: 1, gap: spacing.xxs },
  close: { alignSelf: "flex-end", padding: spacing.lg },
  closeLabel: { color: colors.white, fontSize: typography.titleSecondary },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  destructive: {
    alignItems: "center",
    backgroundColor: colors.error,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 52,
  },
  destructiveDisabled: { backgroundColor: colors.disabledBackground },
  destructiveLabel: { color: colors.white, fontSize: typography.body, fontWeight: "500" },
  enlarged: { height: "100%", width: "100%" },
  failure: { color: colors.errorText },
  helper: { color: colors.textMuted, fontSize: typography.note },
  meta: { color: colors.textMuted, fontSize: typography.note },
  name: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  reasonInput: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: "top" },
  receipt: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    height: 320,
    width: "100%",
  },
  receiptHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  receiptSection: { gap: spacing.sm },
  reject: {
    alignItems: "center",
    borderColor: colors.error,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  rejectForm: { gap: spacing.md },
  rejectLabel: { color: colors.errorText, fontSize: typography.body, fontWeight: "500" },
  screen: { gap: spacing.md },
  sectionTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  viewer: { backgroundColor: "#1B1716", flex: 1 },
  viewerContent: { flexGrow: 1 },
});
