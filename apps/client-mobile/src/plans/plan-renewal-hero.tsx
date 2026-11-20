import type { ClientSubscriptionDto, PlanDto } from "@pilates/api-contracts";
import {
  colors,
  EmphasisCard,
  fontFamilies,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatBolivianos } from "./plan-format";

/**
 * C3 A: the Plan to renew is the one of her current Subscription, or of the
 * last one once it expired, while it is still sold. The summary names it by
 * its snapshot, so the match is by name (FIX-082). A Guest Pass is no Plan.
 */
export function planToRenew(
  view: ClientSubscriptionDto | null,
  plans: readonly PlanDto[],
): PlanDto | null {
  const summary = view?.subscription;
  if (view === null || view.status === "none" || summary == null) return null;
  if (summary.guestPass !== undefined) return null;
  return plans.find((plan) => plan.name === summary.planName) ?? null;
}

/** «90 días · hasta 3 por semana», or «30 días» without a Weekly Cap. */
export function planHeroTerms(plan: Pick<PlanDto, "durationDays" | "weeklyClassCap">) {
  const days = `${plan.durationDays} días`;
  return plan.weeklyClassCap === null ? days : `${days} · hasta ${plan.weeklyClassCap} por semana`;
}

function eyebrow(plan: PlanDto) {
  if (plan.listPriceCentavos === undefined || plan.listPriceCentavos === 0) {
    return "Renueva tu plan";
  }
  const percent = Math.round((1 - plan.priceCentavos / plan.listPriceCentavos) * 100);
  return percent > 0 ? `Renueva tu plan · ${percent} % menos` : "Renueva tu plan";
}

/** The screen's one Palo de rosa block: her Plan, its price and «Renovar este plan». */
export function PlanRenewalHero({ plan, onRenew }: { plan: PlanDto; onRenew: () => void }) {
  return (
    <EmphasisCard
      eyebrow={eyebrow(plan)}
      note={planHeroTerms(plan)}
      testID={`plan-renewal-${plan.id}`}
      title={plan.name}
    >
      <View style={styles.prices}>
        <Text style={styles.price}>{formatBolivianos(plan.priceCentavos)}</Text>
        {plan.listPriceCentavos === undefined ? null : (
          <Text style={styles.listPrice}>{formatBolivianos(plan.listPriceCentavos)}</Text>
        )}
      </View>
      <Pressable
        accessibilityLabel="Renovar este plan"
        accessibilityRole="button"
        onPress={onRenew}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        testID={`plan-renew-${plan.id}`}
      >
        <Text style={styles.buttonLabel}>Renovar este plan</Text>
      </Pressable>
    </EmphasisCard>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.onEmphasis,
    borderRadius: radii.button,
    justifyContent: "center",
    minHeight: 48,
  },
  buttonLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "700",
  },
  listPrice: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    textDecorationLine: "line-through",
  },
  pressed: { opacity: 0.85 },
  price: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
  },
  prices: { alignItems: "baseline", flexDirection: "row", gap: spacing.smLg },
});
