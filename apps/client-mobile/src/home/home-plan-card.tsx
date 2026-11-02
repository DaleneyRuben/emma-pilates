import type { ClientSubscriptionDto } from "@pilates/api-contracts";
import {
  colors,
  EmphasisCard,
  fontFamilies,
  formatBolivianos,
  OnEmphasisButton,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { formatCivilDate } from "./home-format";
import { promotionCardMaxWidth } from "./promotion-image";

type ActiveSubscription = NonNullable<ClientSubscriptionDto["subscription"]>;

const statusPill = { active: "Activo", expiring_soon: "Por vencer" } as const;

function Eyebrow({ children }: { children: string }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

function Pill({ children }: { children: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{children}</Text>
    </View>
  );
}

/** 02's hero with a Plan (follow-up 225 §5): classes left in Lora 40 and a white bar. */
export function ActivePlanCard({
  onDetail,
  status,
  subscription,
}: {
  onDetail: () => void;
  status: keyof typeof statusPill;
  subscription: ActiveSubscription;
}) {
  const remaining = subscription.remainingClassAllowance;
  const original = subscription.originalClassAllowance;
  const progress = original === 0 ? 0 : remaining / original;

  return (
    <View style={[styles.card, styles.capped]} testID="home-plan-card">
      <View style={styles.between}>
        <Eyebrow>{`Tu plan · ${subscription.planName}`}</Eyebrow>
        <Pill>{statusPill[status]}</Pill>
      </View>
      <View style={styles.count}>
        <Text style={styles.bigNumber}>{String(remaining)}</Text>
        <Text style={styles.countLabel}>
          {remaining === 1 ? "clase restante" : "clases restantes"}
        </Text>
      </View>
      <View
        accessibilityLabel={`${remaining} de ${original} clases`}
        accessibilityRole="progressbar"
        accessibilityValue={{ max: original, min: 0, now: remaining }}
        style={styles.track}
      >
        <View style={[styles.fill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>
      <View style={styles.between}>
        <Text style={styles.note}>{`Vence el ${formatCivilDate(subscription.endsOn)}`}</Text>
        <OnEmphasisButton label="Mi plan" onPress={onDetail} testID="home-plan-detail" />
      </View>
    </View>
  );
}

function MatIllustration() {
  return (
    <Svg
      accessibilityElementsHidden
      fill="none"
      height={64}
      importantForAccessibility="no-hide-descendants"
      stroke="rgba(255,255,255,0.45)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      style={styles.illustration}
      viewBox="0 0 64 64"
      width={64}
    >
      <Rect height={8} rx={4} width={52} x={6} y={44} />
      <Circle cx={34} cy={14} r={5} />
      <Path d="M20 42c4-10 10-16 14-20l10 6M34 22l-4 20" />
    </Svg>
  );
}

/** 02's hero without a Plan (walkthrough n.º 5): the price pill, the owner's title, a white pill. */
export function PurchasePlanCard({
  onPurchase,
  plansFromPriceCentavos,
}: {
  onPurchase: () => void;
  plansFromPriceCentavos: number | null | undefined;
}) {
  const fromPrice =
    plansFromPriceCentavos === null || plansFromPriceCentavos === undefined
      ? undefined
      : `Desde ${formatBolivianos(plansFromPriceCentavos)}`;
  return (
    <View style={[styles.purchase, styles.capped]} testID="home-purchase-card">
      <View style={styles.purchaseBody}>
        <EmphasisCard
          action={{ label: "Comprar un plan", onPress: onPurchase, testID: "home-buy-plan" }}
          note="Mat y Reformer · paga por QR o en el estudio"
          pill={fromPrice}
          title="Elige tu plan y empieza a moverte"
        />
      </View>
      <MatIllustration />
    </View>
  );
}

const styles = StyleSheet.create({
  between: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  bigNumber: {
    color: colors.white,
    fontFamily: fontFamilies.display,
    fontSize: 40,
    lineHeight: 44,
  },
  // UX-012: the tablet carousel stops at 720 px; the hero takes the same cap.
  capped: { alignSelf: "center", maxWidth: promotionCardMaxWidth, width: "100%" },
  card: { ...surfaces.emphasis, gap: spacing.md, padding: spacing.xlSm },
  count: { alignItems: "baseline", flexDirection: "row", gap: spacing.sm },
  countLabel: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.75)",
    flexShrink: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  fill: { backgroundColor: colors.white, borderRadius: radii.pill },
  illustration: { alignSelf: "flex-end", marginBottom: spacing.xlSm, marginRight: spacing.xlSm },
  note: {
    color: "rgba(255,255,255,0.85)",
    flexShrink: 1,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.smLg,
    paddingVertical: spacing.xs,
  },
  pillLabel: {
    color: colors.white,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "600",
  },
  purchase: { ...surfaces.emphasis, flexDirection: "row" },
  purchaseBody: { flex: 1 },
  track: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: radii.pill,
    flexDirection: "row",
    height: 6,
    overflow: "hidden",
  },
});
