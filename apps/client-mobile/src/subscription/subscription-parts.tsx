import type { ClientSubscriptionSummaryDto } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  SectionTitle,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatCivilDate } from "../home/home-format";
import { planClasses } from "../home/plan-classes";

// FIX-089: the state in words, «Por vencer» included (Rosa Emma C12n: bold
// white on the hero). FIX-090: an ended plan reads «Plan vencido».
const statusLabels = {
  active: "Activo",
  expiring_soon: "Por vencer",
  expired: "Plan vencido",
} as const;

/**
 * «Clases extra: 1 · Campaña» → «campaña»; «Clases extra: 2 · 1 de invitación
 * · 1 de campaña» → «1 de invitación, 1 de campaña»: where they come from.
 */
function extraOrigin(line: string | null | undefined): string | null {
  const origins = line?.split(" · ").slice(1) ?? [];
  return origins.length === 0 ? null : origins.join(", ").toLowerCase();
}

/**
 * C12's plan card (Rosa Emma C12, C12n, C12b): the screen's 600 hero with the
 * name and its state in bold words, the classes left in Lora 56, and one line
 * with where they come from and the end. An ended plan is a white card, since
 * «Comprar un plan» is then the screen's solid block.
 */
export function SubscriptionHero({
  status,
  subscription,
}: {
  status: keyof typeof statusLabels;
  subscription: ClientSubscriptionSummaryDto;
}) {
  const expired = status === "expired";
  // Walkthrough n.º 61: live extra classes count with the Plan's own.
  const { left, breakdown } = expired ? { left: 0, breakdown: null } : planClasses(subscription);
  const origin = extraOrigin(subscription.extraClassesLine);
  const end = `${expired ? "venció" : "vence"} el ${formatCivilDate(subscription.endsOn)}`;
  const detail =
    breakdown === null
      ? end.charAt(0).toUpperCase() + end.slice(1)
      : `${breakdown}${origin === null ? "" : ` (${origin})`} · ${end}`;
  const ink = expired ? styles.onCard : styles.onHero;
  return (
    <View style={expired ? styles.ended : styles.hero} testID="subscription-hero">
      <View style={styles.between}>
        <Text style={[styles.name, ink]}>
          {expired ? `Último plan · ${subscription.planName}` : subscription.planName}
        </Text>
        <Text style={[styles.statusLabel, ink]}>{statusLabels[status]}</Text>
      </View>
      <View style={styles.count}>
        <Text style={[styles.number, ink]}>{String(left)}</Text>
        <Text style={[styles.countLabel, ink]}>
          {expired
            ? "clases disponibles"
            : breakdown === null
              ? `de ${subscription.originalClassAllowance} clases restantes`
              : "clases restantes"}
        </Text>
      </View>
      <Text style={[styles.note, ink]}>{detail}</Text>
    </View>
  );
}

/** A white card of label and value rows, such as C12's «Detalles». */
export function DetailRows({
  rows,
  title,
}: {
  rows: readonly (readonly [string, string])[];
  title: string;
}) {
  return (
    <View>
      <SectionTitle>{title}</SectionTitle>
      <View style={styles.group}>
        {rows.map(([label, value], index) => (
          <Fragment key={label}>
            {index === 0 ? null : <View style={styles.hairline} />}
            <View style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  between: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  count: { alignItems: "baseline", flexDirection: "row", gap: spacing.smLg },
  countLabel: {
    flexShrink: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.bodyMedium,
    fontWeight: "700",
  },
  ended: { ...surfaces.card, gap: spacing.sm, padding: spacing.xlSm },
  group: { ...surfaces.card, overflow: "hidden" },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  hero: { ...surfaces.emphasis, gap: spacing.sm, padding: spacing.xlSm },
  label: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: 14 },
  name: {
    flexShrink: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
    lineHeight: 22,
  },
  note: { fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  number: { fontFamily: fontFamilies.display, fontSize: 56, lineHeight: 62 },
  onCard: { color: colors.text },
  onHero: { color: colors.onEmphasis },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  statusLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
  },
  value: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontWeight: "700",
    textAlign: "right",
  },
});
