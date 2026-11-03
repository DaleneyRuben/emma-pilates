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
  LoadingState,
  boliviaCivilDate,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
  StartDateChooser,
  typography,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { PlanBreakdown, PlanHero, PlanIncludes } from "./plan-detail-parts";
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
    "Tienes una clase reservada con tu acceso actual. Elige un inicio después de esa clase.",
};

const problemCode = (data: unknown): string | null =>
  typeof data === "object" && data !== null && "code" in data
    ? String((data as { code: unknown }).code)
    : null;

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
      <ScreenTopBar
        fullBleed
        onBack={() => navigation.goBack()}
        title="Elige tu plan"
        tone="context"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <PlanHero plan={detail} />
        <PlanIncludes
          cancellationWindowMinutes={studioRules?.cancellationWindowMinutes}
          plan={detail}
          renewalStartsOn={renewalStartsOn}
        />
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
        <PlanBreakdown plan={detail} />
        {error === null ? null : (
          <BodyText accessibilityRole="alert" style={styles.error}>
            {error}
          </BodyText>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <BodyText style={styles.note}>Pagas por QR y subes tu comprobante</BodyText>
        <PrimaryButton
          busy={busy}
          label={`Pagar ${price}`}
          onPress={() => void continueToPayment()}
          testID="plan-continue-to-payment"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.lg },
  error: { color: colors.errorText },
  footer: { gap: spacing.sm, paddingBottom: spacing.sm, paddingTop: spacing.sm },
  note: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
  screen: { gap: spacing.lg },
});
