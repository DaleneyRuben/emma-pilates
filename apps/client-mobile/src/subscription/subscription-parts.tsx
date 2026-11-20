import type { ClientSubscriptionSummaryDto } from "@pilates/api-contracts";
import { colors, SectionTitle, spacing, surfaces, Text } from "@pilates/mobile-core";
import { Fragment } from "react";
import { StyleSheet, View } from "react-native";

import { formatCivilDate } from "../home/home-format";
import { planClasses } from "../home/plan-classes";

// FIX-089: the state in words, «Por vencer» included (Rosa Emma C12n:
// `pastilla`, white on the hero). FIX-090: an ended plan reads «Plan vencido».
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
 * name and its state in words, the classes left in `cifra-grande`, and one line
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
  const tone = expired ? "ink" : "onDark";
  return (
    <View style={expired ? styles.ended : styles.hero} testID="subscription-hero">
      <View style={styles.between}>
        <Text style={styles.name} tone={tone} variant="titulo-fila">
          {expired ? `Último plan · ${subscription.planName}` : subscription.planName}
        </Text>
        <Text tone={tone} variant="pastilla">
          {statusLabels[status]}
        </Text>
      </View>
      <View style={styles.count}>
        <Text tone={tone} variant="cifra-grande">
          {String(left)}
        </Text>
        <Text style={styles.countLabel} tone={tone} variant="titulo-fila">
          {expired
            ? "clases disponibles"
            : breakdown === null
              ? `de ${subscription.originalClassAllowance} clases restantes`
              : "clases restantes"}
        </Text>
      </View>
      <Text tone={tone} variant="cuerpo">
        {detail}
      </Text>
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
              <Text style={styles.label} variant="cuerpo">
                {label}
              </Text>
              <Text style={styles.value} variant="titulo-fila">
                {value}
              </Text>
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
  countLabel: { flexShrink: 1 },
  ended: { ...surfaces.card, gap: spacing.sm, padding: spacing.xlSm },
  group: { ...surfaces.card, overflow: "hidden" },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  hero: { ...surfaces.emphasis, gap: spacing.sm, padding: spacing.xlSm },
  label: { flex: 1 },
  name: { flexShrink: 1 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  value: { flexShrink: 1, textAlign: "right" },
});
