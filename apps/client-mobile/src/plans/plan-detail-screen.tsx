import {
  completeCreditPurchase,
  createPurchaseIntent,
  getCurrentPurchaseIntent,
  getGetCurrentClientCreditQueryKey,
  getGetCurrentClientSubscriptionQueryKey,
  getGetCurrentPaymentQueryKey,
  getGetCurrentPurchaseIntentQueryKey,
  useGetCurrentClientCredit,
  useGetPlan,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  PrimaryButton,
  QueryFailure,
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
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { describeValidity, formatBolivianos } from "./plan-format";

type PlanDetailNavigation = {
  goBack: () => void;
  navigate: (screen: "Payment" | "PaymentStatus", params?: { purchaseIntentId: string }) => void;
};

const purchaseErrorCopy: Record<string, string> = {
  subscription_not_expired: "Tu plan actual sigue activo. Podrás comprar uno nuevo cuando venza.",
  plan_not_purchasable: "Este plan no está disponible para compra.",
};

const problemCode = (data: unknown): string | null =>
  typeof data === "object" && data !== null && "code" in data
    ? String((data as { code: unknown }).code)
    : null;

const validityCopy = (durationMonths: number): string =>
  durationMonths === 1
    ? "Un mes de vigencia desde que se confirma tu pago."
    : `${durationMonths} meses de vigencia desde que se confirma tu pago.`;

export function PlanDetailScreen({ route }: { route: { params: { planId: string } } }) {
  const navigation = useNavigation<PlanDetailNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const plan = useGetPlan(route.params.planId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const credit = useGetCurrentClientCredit({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (plan.isPending) {
    return (
      <Screen style={styles.screen}>
        <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Detalle del plan" />
        <BodyText accessibilityLabel="Cargando plan">Cargando…</BodyText>
      </Screen>
    );
  }

  if (plan.isError || plan.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Detalle del plan" />
        <QueryFailure label="No pudimos cargar el plan." onRetry={() => void plan.refetch()} />
      </Screen>
    );
  }

  const detail = plan.data.data;
  const price = formatBolivianos(detail.priceCentavos);
  const available = credit.data?.status === 200 ? credit.data.data.availableCentavos : 0;
  const applied = Math.min(available, detail.priceCentavos);
  const total = detail.priceCentavos - applied;

  // Credit that covers the whole price activates the Plan at once; otherwise
  // a Purchase Intent freezes the amount to transfer.
  const continueToPayment = async () => {
    setError(null);
    setBusy(true);
    const headers = { "idempotency-key": randomUUID() };
    try {
      if (total === 0) {
        const purchase = await completeCreditPurchase({ planId: detail.id }, { headers }, fetcher);
        if (purchase.status !== 201) {
          setError(
            purchaseErrorCopy[problemCode(purchase.data) ?? ""] ??
              "No pudimos completar la compra. Inténtalo de nuevo.",
          );
          return;
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetCurrentPaymentQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetCurrentClientCreditQueryKey() }),
          queryClient.invalidateQueries({
            queryKey: getGetCurrentClientSubscriptionQueryKey(),
          }),
        ]);
        navigation.navigate("PaymentStatus");
        return;
      }

      const created = await createPurchaseIntent({ planId: detail.id }, { headers }, fetcher);
      if (created.status === 201) {
        await queryClient.invalidateQueries({ queryKey: getGetCurrentPurchaseIntentQueryKey() });
        navigation.navigate("Payment", { purchaseIntentId: created.data.id });
        return;
      }
      const code = problemCode(created.data);
      if (code === "purchase_intent_open_exists") {
        const open = await getCurrentPurchaseIntent(undefined, fetcher);
        if (open.status === 200) {
          navigation.navigate("Payment", { purchaseIntentId: open.data.id });
          return;
        }
      }
      if (code === "payment_pending_exists") {
        navigation.navigate("PaymentStatus");
        return;
      }
      setError(purchaseErrorCopy[code ?? ""] ?? "No pudimos iniciar el pago. Inténtalo de nuevo.");
    } catch {
      setError("No pudimos iniciar el pago. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title={detail.name} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.planName}>{detail.name}</Text>
          <BodyText>{describeValidity(detail.durationMonths)}</BodyText>
          <Text style={styles.price}>{price}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Qué incluye</Text>
          <BodyText>{`${detail.classAllowance} clases en cualquier sucursal del estudio.`}</BodyText>
          <BodyText>Cancelación sin costo hasta 2 h 30 antes de cada clase.</BodyText>
          <BodyText>{validityCopy(detail.durationMonths)}</BodyText>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desglose</Text>
          <View style={styles.row}>
            <BodyText>Precio del plan</BodyText>
            <BodyText>{price}</BodyText>
          </View>
          {applied > 0 ? (
            <View style={styles.row}>
              <BodyText>Crédito aplicado</BodyText>
              <BodyText style={styles.creditValue}>{`−${formatBolivianos(applied)}`}</BodyText>
            </View>
          ) : null}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total a pagar</Text>
            <Text style={styles.total}>{formatBolivianos(total)}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Siguiente paso</Text>
          <BodyText>
            {total === 0
              ? "Tu crédito cubre todo el plan: se activa al instante, sin transferencia."
              : "Pagas por transferencia con el QR del estudio y subes tu comprobante. El plan se activa cuando el estudio confirma tu pago."}
          </BodyText>
        </View>
        {error === null ? null : (
          <BodyText accessibilityRole="alert" style={styles.error}>
            {error}
          </BodyText>
        )}
        <PrimaryButton
          disabled={busy}
          label="Continuar al pago"
          onPress={() => void continueToPayment()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  creditValue: { color: colors.successText },
  error: { color: colors.errorText },
  planName: {
    color: colors.text,
    fontSize: typography.titleSecondary,
    fontWeight: "500",
  },
  price: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.price,
    marginTop: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  screen: { gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
  total: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.titleSecondary,
  },
  totalLabel: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
  totalRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
});
