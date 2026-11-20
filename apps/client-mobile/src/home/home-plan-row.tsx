import type { ClientSubscriptionDto } from "@pilates/api-contracts";
import {
  Chevron,
  colors,
  ExceptionPill,
  fontFamilies,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
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
 * The Plan row's lines (FIX-082): the count left («25 restantes»), the plan
 * name, then the weekly cap (so 25 never reads against Reservar's 3), the
 * gift classes and the expiry.
 */
export function planRowLines(subscription: ActiveSubscription): {
  count: string;
  unit: string;
  detail: string;
  spoken: string;
} {
  const { left, breakdown } = planClasses(subscription);
  // Plan names often carry their own count («Trimestral 24 clases»), so the
  // count left says «restantes» rather than a second «clases».
  const unit = left === 1 ? "restante" : "restantes";
  const parts = [
    weekLine(subscription.classesLeftThisWeek),
    breakdown,
    `vence el ${formatCivilDate(subscription.endsOn)}`,
  ].filter((part): part is string => part !== null);
  const detail = parts.join(" · ");
  return {
    count: String(left),
    unit,
    detail: detail.charAt(0).toUpperCase() + detail.slice(1),
    spoken: `Mi plan, ${subscription.planName}, ${left === 1 ? "1 clase restante" : `${left} clases restantes`}, ${parts.join(", ")}`,
  };
}

/**
 * Inicio's Plan (Rosa Emma C02): a 500 «medio» block with the count left in
 * large white type beside a white card with the plan's name, its detail and
 * a chevron, tappable as a whole. «Por vencer» is the one pill, as the
 * exception it is.
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
  const { count, unit, detail, spoken } = planRowLines(subscription);
  return (
    <Pressable
      accessibilityLabel={expiringSoon ? `${spoken}, por vencer` : spoken}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID="home-plan-card"
    >
      <View style={styles.medio} testID="home-plan-count">
        <Text style={styles.count}>{count}</Text>
        <Text adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={1} style={styles.unit}>
          {unit}
        </Text>
      </View>
      <View style={styles.card} testID="home-plan-summary">
        <View style={styles.body}>
          <Text style={styles.title}>{subscription.planName}</Text>
          <Text style={styles.detail}>{detail}</Text>
          {expiringSoon ? <ExceptionPill>Por vencer</ExceptionPill> : null}
        </View>
        <Chevron size={18} strokeWidth={1.7} tone="muted" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xs, minWidth: 0 },
  card: {
    ...surfaces.card,
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.smLg,
    padding: spacing.mdLg,
  },
  count: {
    color: colors.onMedio,
    fontFamily: fontFamilies.display,
    fontSize: 34,
    lineHeight: 37,
  },
  detail: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 18,
  },
  medio: {
    ...surfaces.medio,
    gap: spacing.xxs,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    width: 116,
  },
  pressed: { opacity: 0.7 },
  row: {
    // Lined up with the carousel and the button above it on a tablet.
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    maxWidth: promotionCardMaxWidth,
    width: "100%",
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.bodyMedium,
    fontWeight: "700",
  },
  unit: {
    color: colors.onMedio,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.titleSmall,
    fontWeight: "700",
    lineHeight: 22,
  },
});
