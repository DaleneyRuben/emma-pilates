import {
  createPurchaseIntent,
  getCurrentPurchaseIntent,
  getGetCurrentPurchaseIntentQueryKey,
  useGetPlan,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  describeValidity,
  describeWeeklyCap,
  formatCancellationWindow,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { formatBolivianos } from "./plan-format";

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

// Follow-up 176: validity in days (booking ADR-0005); BKM-006 replaces the
// confirmation day with the chosen Start Date.
const validityCopy = (durationDays: number): string =>
  `${durationDays} días de vigencia desde que se confirma tu pago.`;

export function PlanDetailScreen({ route }: { route: { params: { planId: string } } }) {
  const navigation = useNavigation<PlanDetailNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const studioRules = useStudioRules(fetcher);
  const plan = useGetPlan(route.params.planId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (plan.isPending) {
    return (
      <Screen style={styles.screen}>
        <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Detalle del plan" />
        <LoadingState label="Cargando plan" />
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

  // A Purchase Intent freezes the amount to transfer: the Plan's full price,
  // since Credit is retired (PAY-005).
  const continueToPayment = async () => {
    setError(null);
    setBusy(true);
    const headers = { "idempotency-key": randomUUID() };
    try {
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
          <BodyText>{describeValidity(detail.durationDays)}</BodyText>
          <Text style={styles.price}>{price}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Qué incluye</Text>
          <BodyText>{`${detail.classAllowance} clases en cualquier sucursal del estudio.`}</BodyText>
          {studioRules === undefined ? null : (
            <BodyText>
              {`Cancelación sin costo hasta ${formatCancellationWindow(studioRules.cancellationWindowMinutes)} antes de cada clase.`}
            </BodyText>
          )}
          <BodyText>{validityCopy(detail.durationDays)}</BodyText>
          {detail.weeklyClassCap === null ? null : (
            <BodyText>{`${describeWeeklyCap(detail.weeklyClassCap)}.`}</BodyText>
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desglose</Text>
          <View style={styles.row}>
            <BodyText>Precio del plan</BodyText>
            <BodyText>{price}</BodyText>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total a pagar</Text>
            <Text style={styles.total}>{price}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Siguiente paso</Text>
          <BodyText>
            Pagas por transferencia con el QR del estudio y subes tu comprobante. El plan se activa
            cuando el estudio confirma tu pago.
          </BodyText>
        </View>
        {error === null ? null : (
          <BodyText accessibilityRole="alert" style={styles.error}>
            {error}
          </BodyText>
        )}
        <PrimaryButton
          busy={busy}
          label="Continuar al pago"
          onPress={() => void continueToPayment()}
          testID="plan-continue-to-payment"
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
