import type { ClientSubscriptionDto } from "@pilates/api-contracts";
import { Chevron, colors, fontFamilies, spacing, surfaces, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatCivilDate } from "./home-format";
import { planClasses } from "./plan-classes";
import { promotionCardMaxWidth } from "./promotion-image";

type ActiveSubscription = NonNullable<ClientSubscriptionDto["subscription"]>;

function weekLine(classesLeftThisWeek: number | null | undefined): string | null {
  if (classesLeftThisWeek === null || classesLeftThisWeek === undefined) return null;
  // Said as Reservar's notice says it (review of FIX-082).
  if (classesLeftThisWeek === 0) return "ya usaste tus clases de esta semana";
  return classesLeftThisWeek === 1
    ? "esta semana te queda 1"
    : `esta semana te quedan ${classesLeftThisWeek}`;
}

/**
 * The Plan row's lines (FIX-082): «Trimestral · 25 restantes», then the
 * weekly cap (so 25 never reads against Reservar's 3), the gift classes and
 * the expiry.
 */
export function planRowLines(subscription: ActiveSubscription): {
  classes: string;
  detail: string;
  spoken: string;
} {
  const { left, breakdown } = planClasses(subscription);
  // Plan names often carry their own count («Trimestral 24 clases»), so the
  // count left says «restantes» rather than a second «clases».
  const classes = left === 1 ? "1 restante" : `${left} restantes`;
  const parts = [
    weekLine(subscription.classesLeftThisWeek),
    breakdown,
    `vence el ${formatCivilDate(subscription.endsOn)}`,
  ].filter((part): part is string => part !== null);
  const detail = parts.join(" · ");
  return {
    classes,
    detail: detail.charAt(0).toUpperCase() + detail.slice(1),
    spoken: `Mi plan, ${subscription.planName}, ${left === 1 ? "1 clase restante" : `${left} clases restantes`}, ${parts.join(", ")}`,
  };
}

/**
 * Inicio's Plan (design audit 2026-11-18, option A): a light row tappable as
 * a whole with a chevron, no «Mi plan» pill; «Por vencer» is the one pill,
 * as the exception it is.
 */
export function PlanRow({
  expiringSoon,
  onPress,
  subscription,
}: {
  expiringSoon: boolean;
  onPress: () => void;
  subscription: ActiveSubscription;
}) {
  const { classes, detail, spoken } = planRowLines(subscription);
  return (
    <Pressable
      accessibilityLabel={expiringSoon ? `${spoken}, por vencer` : spoken}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID="home-plan-card"
    >
      <View style={styles.body}>
        <Text style={styles.title}>
          {`${subscription.planName} · `}
          <Text style={styles.count}>{classes}</Text>
        </Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      {expiringSoon ? <Text style={styles.expiring}>Por vencer</Text> : null}
      <Chevron size={16} strokeWidth={1.5} tone="muted" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  count: { fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
  detail: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  expiring: {
    color: colors.warningText,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "600",
  },
  pressed: { opacity: 0.7 },
  row: {
    ...surfaces.card,
    alignItems: "center",
    // Lined up with the carousel and the button above it on a tablet.
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    maxWidth: promotionCardMaxWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
    width: "100%",
  },
  title: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
});
