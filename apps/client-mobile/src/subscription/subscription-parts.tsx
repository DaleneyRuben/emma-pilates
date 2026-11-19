import type { ClientSubscriptionSummaryDto } from "@pilates/api-contracts";
import {
  colors,
  ExceptionPill,
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

// FIX-089: a normal state in words; «Por vencer» is the exception, on the
// pill. FIX-090: an ended plan reads «Plan vencido».
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
 * C12's plan card. FIX-082 (design audit 2026-11-18, Mi plan option A): a
 * light card like Inicio's plan row: the name and its state in words (the
 * Rubor pill only for «Por vencer», FIX-089), the classes left in Lora, and
 * one line with where they come from and the end.
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
  return (
    <View style={styles.hero} testID="subscription-hero">
      <View style={styles.between}>
        <Text style={styles.name}>
          {expired ? `Último plan · ${subscription.planName}` : subscription.planName}
        </Text>
        {status === "expiring_soon" ? (
          <ExceptionPill>{statusLabels[status]}</ExceptionPill>
        ) : (
          <Text style={styles.statusLabel}>{statusLabels[status]}</Text>
        )}
      </View>
      <View style={styles.count}>
        <Text style={styles.number}>{String(left)}</Text>
        <Text style={styles.countLabel}>
          {expired
            ? "clases disponibles"
            : breakdown === null
              ? `de ${subscription.originalClassAllowance} clases restantes`
              : "clases restantes"}
        </Text>
      </View>
      <Text style={styles.note}>{detail}</Text>
    </View>
  );
}

/** A Lino group of label and value rows, such as C12's «Detalles». */
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
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  count: { alignItems: "baseline", flexDirection: "row", gap: spacing.sm },
  countLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: spacing.lg },
  hero: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lgXl },
  label: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  name: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
  },
  note: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  number: { color: colors.text, fontFamily: fontFamilies.display, fontSize: typography.display },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  statusLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  value: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
    textAlign: "right",
  },
});
