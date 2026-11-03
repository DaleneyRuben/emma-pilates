import { useListPlans, type PlanDto } from "@pilates/api-contracts";
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
import { useNavigation } from "@react-navigation/native";
import { Fragment } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { formatBolivianos } from "./plan-format";

type PlansNavigation = {
  goBack: () => void;
  navigate: (screen: "PlanDetail", params: { planId: string }) => void;
};

/** C08's terms line: «Válido por 30 días», or «60 días · hasta 3 por semana». */
export function planRowTerms(
  plan: Pick<PlanDto, "classAllowance" | "durationDays" | "weeklyClassCap">,
) {
  if (plan.weeklyClassCap !== null) {
    return `${plan.durationDays} días · hasta ${plan.weeklyClassCap} por semana`;
  }
  return `${plan.classAllowance === 1 ? "Válida" : "Válido"} por ${plan.durationDays} días`;
}

/**
 * Walkthrough n.º 13: the launch banner while the 15 % applies to this
 * Client. «¡Quedan solo N lugares…!» needs the places left, which the API
 * does not expose yet (BKM-019), so only the general line shows.
 */
function LaunchBanner() {
  return (
    <View accessibilityRole="text" style={styles.banner} testID="plans-launch-banner">
      <Glyph color={colors.primaryOnTint} name="tag" size={20} strokeWidth={1.6} />
      <Text style={styles.bannerText}>Oferta por tiempo limitado · 15 % en tu plan</Text>
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

export function PlansScreen() {
  const navigation = useNavigation<PlansNavigation>();
  const fetcher = useClientFetcher();
  const plans = useListPlans({
    fetcher,
    query: { refetchOnMount: "always" },
  });

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Elige tu plan" />
      {plans.isPending ? (
        <LoadingState label="Cargando planes" />
      ) : plans.isError || plans.data.status !== 200 ? (
        <QueryFailure label="No pudimos cargar los planes." onRetry={() => void plans.refetch()} />
      ) : plans.data.data.length === 0 ? (
        <BodyText>Por ahora no hay planes disponibles.</BodyText>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {plans.data.data.some((plan) => plan.listPriceCentavos !== undefined) ? (
            <LaunchBanner />
          ) : null}
          <View style={styles.group}>
            {plans.data.data.map((plan, index) => (
              <Fragment key={plan.id}>
                {index === 0 ? null : <View style={styles.hairline} />}
                <PlanRow
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
  bannerText: {
    color: colors.primaryOnTint,
    flex: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
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
