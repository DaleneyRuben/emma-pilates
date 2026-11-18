import {
  useGetCurrentClientSubscription,
  useListPlans,
  type PlanDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  Chevron,
  colors,
  describePlanCardLabel,
  fontFamilies,
  Glyph,
  LoadingState,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { Fragment, useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { usePaymentStanding } from "../payments/payment-standing";
import { formatBolivianos } from "./plan-format";

/** Set when «Subir otro comprobante» found the rejected Plan no longer sold. */
export type PlansParams = { rejectedPlanGone?: true };

type PlansNavigation = {
  goBack: () => void;
  navigate: (screen: "PlanDetail", params: { planId: string }) => void;
  replace: (screen: "PaymentStatus") => void;
};

/** «Válido por 30 días»: the Plan is valid, whatever its classes (FIX-082). */
export function planValidity(plan: Pick<PlanDto, "durationDays">): string {
  return `Válido por ${plan.durationDays} días`;
}

/** C08's terms line: «Válido por 30 días», or «Válido por 60 días · hasta 3 por semana». */
export function planRowTerms(plan: Pick<PlanDto, "durationDays" | "weeklyClassCap">) {
  if (plan.weeklyClassCap !== null) {
    return `${planValidity(plan)} · hasta ${plan.weeklyClassCap} por semana`;
  }
  return planValidity(plan);
}

/** The places left the API sends (BKM-019) only while 10 or fewer remain. */
function launchPlacesLeft(plans: readonly PlanDto[]): number | null {
  const counts = plans.flatMap((plan) =>
    plan.launchPlacesLeft === undefined ? [] : [plan.launchPlacesLeft],
  );
  return counts.length === 0 ? null : Math.min(...counts);
}

const scarcityLine = (placesLeft: number) =>
  placesLeft === 1
    ? "¡Queda solo 1 lugar con 15 % de descuento!"
    : `¡Quedan solo ${placesLeft} lugares con 15 % de descuento!`;

/**
 * Walkthrough n.º 13: the launch banner while the 15 % applies to this
 * Client, in the strong tone with the count when few places are left (C08b).
 * It never says «Fundadora» nor how many places there were.
 */
function LaunchBanner({ placesLeft }: { placesLeft: number | null }) {
  const strong = placesLeft !== null;
  return (
    <View
      accessibilityRole="text"
      style={[styles.banner, strong && styles.bannerStrong]}
      testID="plans-launch-banner"
    >
      <Glyph
        color={strong ? colors.white : colors.primaryOnTint}
        name={strong ? "flame" : "tag"}
        size={20}
        strokeWidth={1.6}
      />
      <Text style={[styles.bannerText, strong && styles.bannerTextStrong]}>
        {strong ? scarcityLine(placesLeft) : "Oferta por tiempo limitado · 15 % en tu plan"}
      </Text>
    </View>
  );
}

function PlanRow({
  current,
  plan,
  onPress,
}: {
  current: boolean;
  plan: PlanDto;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={
        current ? `${describePlanCardLabel(plan)}, tu plan actual` : describePlanCardLabel(plan)
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`plan-card-${plan.id}`}
    >
      <View style={styles.rowBody}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.terms}>{planRowTerms(plan)}</Text>
        {current ? <Text style={styles.current}>Tu plan actual</Text> : null}
      </View>
      <View style={styles.prices}>
        <Text style={styles.price}>{formatBolivianos(plan.priceCentavos)}</Text>
        {plan.listPriceCentavos === undefined ? null : (
          <Text style={styles.listPrice}>{formatBolivianos(plan.listPriceCentavos)}</Text>
        )}
      </View>
      <Chevron size={16} strokeWidth={1.5} tone="muted" />
    </Pressable>
  );
}

export function PlansScreen({ route }: { route?: { params?: PlansParams } }) {
  const navigation = useNavigation<PlansNavigation>();
  const fetcher = useClientFetcher();
  const plans = useListPlans({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  // Follow-up 246 §5: while a payment is in review or rejected, every way
  // into Elegir plan opens that payment instead (owner, 2026-11-05: after a
  // rejection, only another receipt for the same Plan).
  // A rejected Plan that is no longer sold opens the list anyway (review of
  // FIX-043), and only the focused screen redirects: a Plans screen left under
  // the payment must not replace itself when the payment turns pending.
  const focused = useIsFocused();
  const { pending: paymentPending, standing } = usePaymentStanding(fetcher);
  // FIX-082: the Plan she has now is marked; the summary names it by its
  // snapshot, so the match is by name.
  const subscription = useGetCurrentClientSubscription({ fetcher });
  const view = subscription.data?.status === 200 ? subscription.data.data : null;
  const currentPlanName =
    view !== null && (view.status === "active" || view.status === "expiring_soon")
      ? (view.subscription?.planName ?? null)
      : null;
  const blocked =
    standing.kind === "in_review" ||
    (standing.kind === "rejected" && route?.params?.rejectedPlanGone !== true);
  useEffect(() => {
    if (blocked && focused) navigation.replace("PaymentStatus");
  }, [blocked, focused, navigation]);

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Elige tu plan" />
      {plans.isPending || paymentPending || blocked ? (
        <LoadingState label="Cargando planes" />
      ) : plans.isError || plans.data.status !== 200 ? (
        <QueryFailure label="No pudimos cargar los planes." onRetry={() => void plans.refetch()} />
      ) : plans.data.data.length === 0 ? (
        <BodyText>Por ahora no hay planes disponibles.</BodyText>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {plans.data.data.some((plan) => plan.listPriceCentavos !== undefined) ? (
            <LaunchBanner placesLeft={launchPlacesLeft(plans.data.data)} />
          ) : null}
          <View style={styles.group}>
            {plans.data.data.map((plan, index) => (
              <Fragment key={plan.id}>
                {index === 0 ? null : <View style={styles.hairline} />}
                <PlanRow
                  current={plan.name === currentPlanName}
                  onPress={() => navigation.navigate("PlanDetail", { planId: plan.id })}
                  plan={plan}
                />
              </Fragment>
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bannerStrong: { backgroundColor: colors.emphasis },
  bannerText: {
    color: colors.primaryOnTint,
    flex: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  bannerTextStrong: { color: colors.white },
  current: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.note,
    fontWeight: "500",
  },
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: spacing.lg },
  list: { gap: spacing.xl, paddingBottom: spacing.xxl },
  listPrice: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.label,
    textDecorationLine: "line-through",
  },
  planName: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.bodyMedium,
    fontWeight: "500",
  },
  pressed: { opacity: 0.7 },
  price: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  prices: { alignItems: "flex-end" },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowBody: { flex: 1, gap: spacing.xxs },
  screen: { gap: spacing.lg },
  terms: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
});
