import {
  type ClientSubscriptionDto,
  createPurchaseIntent,
  getCurrentPurchaseIntent,
  getGetCurrentPurchaseIntentQueryKey,
  useGetCurrentClientSubscription,
  useGetPlan,
  useListBranches,
} from "@pilates/api-contracts";
import {
  addCivilDays,
  BodyText,
  boliviaCivilDate,
  colors,
  fontFamilies,
  footerEdges,
  FooterPanel,
  Glyph,
  LoadingState,
  NextPlanStartChooser,
  PrimaryButton,
  QueryFailure,
  radii,
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

const bookedClassRule = purchaseErrorCopy.start_date_before_booked_class;

// Walkthrough n.º 58: a plan starts after the guest class she booked, so the
// first day it can start is the day after that class.
const firstStartAfterGuestClass = (
  subscription: ClientSubscriptionDto | undefined,
  today: string,
  now: Date,
): string | null => {
  const classStartsAt = subscription?.subscription?.guestPass?.usedClassStartsAt;
  // Only a class still ahead holds the start back, as on the server.
  if (classStartsAt == null || new Date(classStartsAt).getTime() <= now.getTime()) return null;
  const classDay = boliviaCivilDate(new Date(classStartsAt));
  return classDay < today ? null : addCivilDays(classDay, 1);
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
  // A renewal while the current Plan still has classes starts after it ends:
  // the API names the day after, and she may pick up to 28 days after the end
  // (FIX-002, booking ADR-0013).
  const subscription = useGetCurrentClientSubscription({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const branches = useListBranches({ fetcher, query: { staleTime: 60_000 } });
  const activeBranchCount = branches.data?.status === 200 ? branches.data.data.length : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = boliviaCivilDate(new Date());
  const [chosenStart, setChosenStart] = useState<string | undefined>(undefined);
  const [nextStart, setNextStart] = useState<string | undefined>(undefined);

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
  const view = subscription.data?.status === 200 ? subscription.data.data : undefined;
  const renewalStartsOn = view?.renewalStartsOn;
  const firstStart = firstStartAfterGuestClass(view, today, new Date());
  const startsOn = chosenStart ?? firstStart ?? today;
  const beforeGuestClass = firstStart !== null && startsOn < firstStart;

  // A Purchase Intent freezes the amount to transfer: the Plan's full price,
  // since Credit is retired (PAY-005).
  const continueToPayment = async () => {
    setError(null);
    setBusy(true);
    const headers = { "idempotency-key": randomUUID() };
    try {
      const created = await createPurchaseIntent(
        {
          planId: detail.id,
          startsOn: renewalStartsOn === undefined ? startsOn : (nextStart ?? renewalStartsOn),
        },
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
    <Screen edges={footerEdges} style={styles.screen}>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title={detail.name} />
      <ScrollView contentContainerStyle={styles.content}>
        <PlanHero plan={detail} />
        <PlanIncludes
          activeBranchCount={activeBranchCount}
          cancellationWindowMinutes={studioRules?.cancellationWindowMinutes}
          plan={detail}
        />
        {renewalStartsOn === undefined ? null : (
          <NextPlanStartChooser
            currentPlan="Tu plan actual"
            firstDay={renewalStartsOn}
            onSelect={setNextStart}
            selected={nextStart ?? renewalStartsOn}
          />
        )}
        {studioRules === undefined ||
        subscription.isPending ||
        renewalStartsOn !== undefined ? null : (
          <StartDateChooser
            openingDate={studioRules.openingDate}
            selected={startsOn}
            startDateLimitDays={studioRules.startDateLimitDays}
            today={today}
            onSelect={setChosenStart}
          />
        )}
        {firstStart === null || renewalStartsOn !== undefined ? null : beforeGuestClass ? (
          <Aside alert text={bookedClassRule} />
        ) : (
          <Aside text={bookedClassRule} />
        )}
        <PlanBreakdown plan={detail} />
        {error === null ? null : <Aside alert text={error} />}
      </ScrollView>
      {/* Rosa Emma C09: the button and its line on a white panel cast upward. */}
      <FooterPanel testID="plan-detail-footer">
        <BodyText style={styles.note}>Pagas por QR y subes tu comprobante</BodyText>
        <PrimaryButton
          busy={busy}
          label={`Pagar ${price}`}
          onPress={() => void continueToPayment()}
          testID="plan-continue-to-payment"
        />
      </FooterPanel>
    </Screen>
  );
}

/**
 * A line under the start dates or the breakdown (Rosa Emma C09g): an alert
 * on 50 with its outline and glyph, a quiet rule in a white card.
 */
function Aside({ alert = false, text }: { alert?: boolean; text: string }) {
  return (
    <View style={[styles.aside, alert && styles.asideAlert]}>
      {alert ? <Glyph color={colors.errorText} name="alert" size={18} strokeWidth={1.7} /> : null}
      <BodyText accessibilityRole={alert ? "alert" : undefined} style={styles.asideText}>
        {text}
      </BodyText>
    </View>
  );
}

const styles = StyleSheet.create({
  aside: {
    ...surfaces.card,
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  asideAlert: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.borderStrong,
    borderRadius: radii.inset,
    borderWidth: 1,
    boxShadow: "none",
  },
  asideText: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
  },
  content: { gap: spacing.md, paddingBottom: spacing.lg },
  note: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    textAlign: "center",
  },
  screen: { gap: spacing.lg, paddingBottom: 0 },
});
