import type { PlanDto } from "@pilates/api-contracts";
import {
  colors,
  describeWeeklyCap,
  discountPercent,
  EmphasisCard,
  formatCancellationWindow,
  IconRow,
  IconRowGroup,
  SectionTitle,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

import { formatBolivianos } from "./plan-format";
import { planValidity } from "./plans-screen";

/**
 * C09's hero: its validity, the price in `cifra-grande`, and the struck list price.
 * The header above names the Plan, so the hero does not repeat it (FIX-089).
 */
export function PlanHero({ plan }: { plan: PlanDto }) {
  const percent = discountPercent(plan);
  return (
    <EmphasisCard
      note={planValidity(plan)}
      pill={percent === null ? undefined : `${percent} % de descuento`}
      testID="plan-hero"
    >
      <View style={styles.prices}>
        <Text tone="onDark" variant="cifra-grande">
          {formatBolivianos(plan.priceCentavos)}
        </Text>
        {plan.listPriceCentavos === undefined ? null : (
          <Text strike tone="onDark" variant="secundario">
            {formatBolivianos(plan.listPriceCentavos)}
          </Text>
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

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} variant="cuerpo">
        {label}
      </Text>
      <Text variant="titulo-fila">{value}</Text>
    </View>
  );
}

/** C09's «Desglose»: a white card with the list price, the discount, and the total in `cifra`. */
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
              value={`−${formatBolivianos(list - plan.priceCentavos)}`}
            />
          </>
        )}
        <View style={styles.hairline} />
        <View style={styles.row}>
          <Text style={styles.rowLabel} variant="titulo-fila">
            Total
          </Text>
          <Text variant="cifra">{formatBolivianos(plan.priceCentavos)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { ...surfaces.card, overflow: "hidden" },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  prices: { alignItems: "baseline", flexDirection: "row", gap: spacing.smLg },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowLabel: { flex: 1 },
});
