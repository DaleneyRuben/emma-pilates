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
  SectionTitle,
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
import { PlanRenewalHero, planToRenew } from "./plan-renewal-hero";

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
 * It never says «Fundadora» nor how many places there were. Palette B
 * (FIX-089): a Crema card with a plain icon; the strong tone is the screen's
 * one Palo de rosa hero, so it stays Crema under the Plan to renew (C3 A).
 */
function LaunchBanner({ placesLeft, quiet }: { placesLeft: number | null; quiet: boolean }) {
  const scarce = placesLeft !== null;
  const strong = scarce && !quiet;
  return (
    <View
      accessibilityRole="text"
      style={[styles.banner, strong && styles.bannerStrong]}
      testID="plans-launch-banner"
    >
      <Glyph
        color={strong ? colors.onEmphasis : colors.text}
        name={scarce ? "flame" : "tag"}
        size={20}
        strokeWidth={1.6}
      />
      <Text style={[styles.bannerText, strong && styles.bannerTextStrong]}>
        {scarce ? scarcityLine(placesLeft) : "Oferta por tiempo limitado · 15 % en tu plan"}
      </Text>
    </View>
  );
}

function PlanRow({ plan, onPress }: { plan: PlanDto; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={describePlanCardLabel(plan)}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`plan-card-${plan.id}`}
    >
      <View style={styles.rowBody}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.terms}>{planRowTerms(plan)}</Text>
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
  // C3 A: the Plan she has, or last had, goes on top to renew.
  const subscription = useGetCurrentClientSubscription({ fetcher });
  const view = subscription.data?.status === 200 ? subscription.data.data : null;
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
        <PlanList
          onOpen={(planId) => navigation.navigate("PlanDetail", { planId })}
          plans={plans.data.data}
          renewal={planToRenew(view, plans.data.data)}
        />
      )}
    </Screen>
  );
}

function PlanList({
  onOpen,
  plans,
  renewal,
}: {
  onOpen: (planId: string) => void;
  plans: readonly PlanDto[];
  renewal: PlanDto | null;
}) {
  const others = plans.filter((plan) => plan.id !== renewal?.id);
  const banner = plans.some((plan) => plan.listPriceCentavos !== undefined) ? (
    <LaunchBanner placesLeft={launchPlacesLeft(plans)} quiet={renewal !== null} />
  ) : null;
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {renewal === null ? (
        banner
      ) : (
        <PlanRenewalHero onRenew={() => onOpen(renewal.id)} plan={renewal} />
      )}
      {others.length === 0 ? null : (
        <View>
          {renewal === null ? null : <SectionTitle>Otros planes</SectionTitle>}
          <View style={styles.group}>
            {others.map((plan, index) => (
              <Fragment key={plan.id}>
                {index === 0 ? null : <View style={styles.hairline} />}
                <PlanRow onPress={() => onOpen(plan.id)} plan={plan} />
              </Fragment>
            ))}
          </View>
        </View>
      )}
      {renewal === null ? null : banner}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bannerStrong: { ...surfaces.emphasis, borderWidth: 0 },
  bannerText: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  bannerTextStrong: { color: colors.onEmphasis },
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: spacing.lg },
  list: { gap: spacing.xl, paddingBottom: spacing.xxl },
  listPrice: {
    color: colors.text,
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
  terms: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
});
