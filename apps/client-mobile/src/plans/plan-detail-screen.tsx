import {
  createPurchaseIntent,
  getCurrentPurchaseIntent,
  getGetCurrentPurchaseIntentQueryKey,
  useGetCurrentClientSubscription,
  useGetPlan,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  describeValidity,
  describeWeeklyCap,
  formatCancellationWindow,
  LoadingState,
  boliviaCivilDate,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
  StartDateChooser,
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
import { formatCivilDate } from "../home/home-format";
import { formatBolivianos } from "./plan-format";

type PlanDetailNavigation = {
  goBack: () => void;
  navigate: (screen: "Payment" | "PaymentStatus", params?: { purchaseIntentId: string }) => void;
};

const purchaseErrorCopy: Record<string, string> = {
  subscription_not_expired: "Tu plan actual sigue activo. Podrás comprar uno nuevo cuando venza.",
  plan_not_purchasable: "Este plan no está disponible para compra.",
  start_date_out_of_window: "Esa fecha de inicio no está disponible.",
  future_subscription_exists: "Ya tienes un plan siguiente.",
  start_date_before_booked_class:
    "Tienes una clase de invitada reservada. Elige un inicio después de esa clase.",
};

const problemCode = (data: unknown): string | null =>
  typeof data === "object" && data !== null && "code" in data
    ? String((data as { code: unknown }).code)
    : null;

// Follow-up 176: validity in days (booking ADR-0005); BKM-006 replaces the
// confirmation day with the chosen Start Date.
const validityCopy = (durationDays: number): string =>
  `${durationDays} días de vigencia desde la fecha de inicio.`;

export function PlanDetailScreen({ route }: { route: { params: { planId: string } } }) {
  const navigation = useNavigation<PlanDetailNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const studioRules = useStudioRules(fetcher);
  const plan = useGetPlan(route.params.planId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  // A renewal while the current Plan still has classes starts the day after
  // it ends: the API names that date and no Start Date is chosen (FIX-002).
  const subscription = useGetCurrentClientSubscription({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = boliviaCivilDate(new Date());
  const [startsOn, setStartsOn] = useState(today);

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
  const renewalStartsOn =
    subscription.data?.status === 200 ? subscription.data.data.renewalStartsOn : undefined;

  // A Purchase Intent freezes the amount to transfer: the Plan's full price,
  // since Credit is retired (PAY-005).
  const continueToPayment = async () => {
    setError(null);
    setBusy(true);
    const headers = { "idempotency-key": randomUUID() };
    try {
      const created = await createPurchaseIntent(
        renewalStartsOn === undefined ? { planId: detail.id, startsOn } : { planId: detail.id },
        { headers },
        fetcher,
      );
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
          <View style={styles.priceRow}>
            {detail.listPriceCentavos === undefined ? null : (
              <Text style={styles.listPrice}>{formatBolivianos(detail.listPriceCentavos)}</Text>
            )}
            <Text style={styles.price}>{price}</Text>
          </View>
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
          {renewalStartsOn === undefined ? null : (
            <BodyText>
              {`Tu nuevo plan empieza el ${formatCivilDate(renewalStartsOn)}, al terminar el actual.`}
            </BodyText>
          )}
          {studioRules === undefined ||
          subscription.isPending ||
          renewalStartsOn !== undefined ? null : (
            <StartDateChooser
              openingDate={studioRules.openingDate}
              selected={startsOn}
              startDateLimitDays={studioRules.startDateLimitDays}
              today={today}
              onSelect={setStartsOn}
            />
          )}
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
  listPrice: {
    color: colors.textSubtle,
    fontSize: typography.note,
    textDecorationLine: "line-through",
  },
  price: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.price,
    marginTop: spacing.sm,
  },
  priceRow: { alignItems: "flex-end", gap: spacing.xs },
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
