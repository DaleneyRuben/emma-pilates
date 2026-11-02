import type { ClientOverviewDto } from "@pilates/api-contracts";
import { colors, EmphasisCard, fontFamilies, radii, spacing } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { formatCivilDate } from "./assistant-format";

type Subscription = NonNullable<ClientOverviewDto["subscription"]["subscription"]>;

/**
 * S06's Plan on the screen's one Rosa profundo card (walkthrough 17): the
 * classes left in Lora 32, a white progress bar, and when it ends.
 */
export function PlanHero({
  active,
  subscription,
}: {
  active: boolean;
  subscription: Subscription;
}) {
  const total = Math.max(subscription.originalClassAllowance, 1);
  const left = subscription.remainingClassAllowance;
  return (
    <EmphasisCard
      eyebrow={subscription.planName}
      note={`${active ? "Vence el" : "Venció el"} ${formatCivilDate(subscription.endsOn)}`}
      pill={active ? "Activo" : "Vencido"}
      testID="client-plan-hero"
    >
      <View style={styles.count}>
        <Text style={styles.left}>{String(left)}</Text>
        <Text
          style={styles.of}
        >{`clases restantes de ${subscription.originalClassAllowance}`}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${Math.min(100, (left / total) * 100)}%` }]} />
      </View>
      {subscription.extraClassesLine ? (
        <Text style={styles.of}>{subscription.extraClassesLine}</Text>
      ) : null}
    </EmphasisCard>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.white, borderRadius: radii.pill, height: 6 },
  count: { alignItems: "baseline", flexDirection: "row", gap: spacing.sm },
  left: {
    color: colors.white,
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
  },
  of: { color: "rgba(255,255,255,0.85)", fontFamily: fontFamilies.body, fontSize: 14 },
  track: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: radii.pill, height: 6 },
});
