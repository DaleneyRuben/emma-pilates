import type { ClientSubscriptionSummaryDto } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  radii,
  SectionTitle,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatCivilDate } from "../home/home-format";
import { planClasses } from "../home/plan-classes";

const statusDots = {
  active: { label: "Activo", dot: colors.success, text: colors.successText },
  expiring_soon: { label: "Por vencer", dot: colors.warning, text: colors.warningText },
  expired: { label: "Vencido", dot: colors.iconQuiet, text: colors.textMuted },
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
 * light Lino card like Inicio's plan row: the name and a status dot, the
 * classes left in Lora, and one line with where they come from and the end.
 */
export function SubscriptionHero({
  status,
  subscription,
}: {
  status: keyof typeof statusDots;
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
  const dot = statusDots[status];
  return (
    <View style={styles.hero} testID="subscription-hero">
      <View style={styles.between}>
        <Text style={styles.name}>
          {expired ? `Último plan · ${subscription.planName}` : subscription.planName}
        </Text>
        <View style={styles.status}>
          <View
            style={[styles.dot, { backgroundColor: dot.dot }]}
            testID="subscription-status-dot"
          />
          <Text style={[styles.statusLabel, { color: dot.text }]}>{dot.label}</Text>
        </View>
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
  countLabel: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.body },
  dot: { borderRadius: radii.pill, height: 7, width: 7 },
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: spacing.lg },
  hero: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lgXl },
  label: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.body },
  name: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
  },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  number: { color: colors.text, fontFamily: fontFamilies.display, fontSize: typography.display },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  status: { alignItems: "center", flexDirection: "row", gap: spacing.smd },
  statusLabel: { fontFamily: fontFamilies.body, fontSize: typography.note },
  value: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
    textAlign: "right",
  },
});
