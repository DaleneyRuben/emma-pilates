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

const pills = { active: "Activo", expiring_soon: "Por vencer", expired: "Vencido" } as const;

/** C12's hero: classes left in Lora 40, the white bar, and the end date. */
export function SubscriptionHero({
  status,
  subscription,
}: {
  status: keyof typeof pills;
  subscription: ClientSubscriptionSummaryDto;
}) {
  const expired = status === "expired";
  const remaining = expired ? 0 : subscription.remainingClassAllowance;
  const original = subscription.originalClassAllowance;
  const progress = original === 0 ? 0 : remaining / original;
  return (
    <View style={styles.hero} testID="subscription-hero">
      <View style={styles.between}>
        <Text style={styles.eyebrow}>
          {`${expired ? "Último plan" : "Tu plan"} · ${subscription.planName}`}
        </Text>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>{pills[status]}</Text>
        </View>
      </View>
      <View style={styles.count}>
        <Text style={styles.number}>{String(remaining)}</Text>
        <Text style={styles.countLabel}>
          {expired ? "clases disponibles" : `de ${original} clases restantes`}
        </Text>
      </View>
      {expired ? null : (
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ max: original, min: 0, now: remaining }}
          style={styles.track}
        >
          <View style={[styles.fill, { flex: progress }]} />
          <View style={{ flex: 1 - progress }} />
        </View>
      )}
      <Text style={styles.note}>
        {`${expired ? "Venció" : "Vence"} el ${formatCivilDate(subscription.endsOn)}`}
      </Text>
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

const white85 = "rgba(255,255,255,0.85)";

const styles = StyleSheet.create({
  between: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  count: { alignItems: "baseline", flexDirection: "row", gap: spacing.sm },
  countLabel: { color: white85, fontFamily: fontFamilies.body, fontSize: typography.body },
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
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: spacing.lg },
  hero: { ...surfaces.emphasis, gap: spacing.md, padding: spacing.xlSm },
  label: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.body },
  note: { color: white85, fontFamily: fontFamilies.body, fontSize: 14 },
  number: { color: colors.white, fontFamily: fontFamilies.display, fontSize: 40 },
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
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  track: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: radii.pill,
    flexDirection: "row",
    height: 6,
    overflow: "hidden",
  },
  value: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
    textAlign: "right",
  },
});
