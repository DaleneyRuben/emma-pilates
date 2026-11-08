import type { PlanDto } from "@pilates/api-contracts";
import {
  colors,
  describeWeeklyCap,
  EmphasisCard,
  fontFamilies,
  formatCancellationWindow,
  IconRow,
  IconRowGroup,
  SectionTitle,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { formatBolivianos } from "./plan-format";

/** The whole-percent discount a founder price carries, or null without one. */
export function discountPercent(plan: Pick<PlanDto, "listPriceCentavos" | "priceCentavos">) {
  if (plan.listPriceCentavos === undefined || plan.listPriceCentavos === 0) return null;
  return Math.round((1 - plan.priceCentavos / plan.listPriceCentavos) * 100);
}

/** C09's hero: the Plan, its validity, the price in Lora 32, and the struck list price. */
export function PlanHero({ plan }: { plan: PlanDto }) {
  const percent = discountPercent(plan);
  return (
    <EmphasisCard
      note={`${plan.classAllowance === 1 ? "Válida" : "Válido"} por ${plan.durationDays} días`}
      pill={percent === null ? undefined : `${percent} % de descuento`}
      testID="plan-hero"
      title={plan.name}
    >
      <View style={styles.prices}>
        <Text style={styles.price}>{formatBolivianos(plan.priceCentavos)}</Text>
        {plan.listPriceCentavos === undefined ? null : (
          <Text style={styles.listPrice}>{formatBolivianos(plan.listPriceCentavos)}</Text>
        )}
      </View>
    </EmphasisCard>
  );
}

/**
 * C09's «Qué incluye» as icon rows instead of paragraphs. «en cualquier
 * sucursal» only from the second active Branch (walkthrough finding 50).
 */
export function PlanIncludes({
  activeBranchCount,
  cancellationWindowMinutes,
  plan,
}: {
  activeBranchCount: number | undefined;
  cancellationWindowMinutes: number | undefined;
  plan: PlanDto;
}) {
  const classes =
    activeBranchCount !== undefined && activeBranchCount > 1
      ? `${plan.classAllowance} clases en cualquier sucursal`
      : `${plan.classAllowance} clases`;
  return (
    <View>
      <SectionTitle>Qué incluye</SectionTitle>
      <IconRowGroup>
        <IconRow icon="calendar" label={classes} />
        {cancellationWindowMinutes === undefined ? null : (
          <IconRow
            icon="undo"
            label={`Cancela sin costo hasta ${formatCancellationWindow(cancellationWindowMinutes)} antes`}
          />
        )}
        <IconRow icon="sun" label={`${plan.durationDays} días desde la fecha de inicio`} />
        {plan.weeklyClassCap === null ? null : (
          <IconRow icon="clock" label={describeWeeklyCap(plan.weeklyClassCap) ?? ""} />
        )}
      </IconRowGroup>
    </View>
  );
}

function BreakdownRow({ label, tone, value }: { label: string; tone?: "discount"; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, tone === "discount" && styles.discount]}>{value}</Text>
    </View>
  );
}

/** C09's «Desglose»: the list price, the discount in Rosa enlace, and the total in Lora 22. */
export function PlanBreakdown({ plan }: { plan: PlanDto }) {
  const percent = discountPercent(plan);
  const list = plan.listPriceCentavos ?? plan.priceCentavos;
  return (
    <View>
      <SectionTitle>Desglose</SectionTitle>
      <View style={styles.group}>
        <BreakdownRow label="Precio del plan" value={formatBolivianos(list)} />
        {percent === null ? null : (
          <>
            <View style={styles.hairline} />
            <BreakdownRow
              label={`Descuento ${percent} %`}
              tone="discount"
              value={`−${formatBolivianos(list - plan.priceCentavos)}`}
            />
          </>
        )}
        <View style={styles.hairline} />
        <View style={styles.row}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{formatBolivianos(plan.priceCentavos)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  discount: { color: colors.primaryOnTint },
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: spacing.lg },
  listPrice: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    textDecorationLine: "line-through",
  },
  price: {
    color: colors.white,
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
  },
  prices: { alignItems: "baseline", flexDirection: "row", gap: spacing.sm },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  rowLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  rowValue: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
  },
  total: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 22 },
  totalLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
});
