import { formatListDate, type ClientOverviewDto } from "@pilates/api-contracts";
import { colors, fontFamilies, spacing, surfaces, typography } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { bookableClasses } from "./bookable-classes";

type Subscription = NonNullable<ClientOverviewDto["subscription"]["subscription"]>;

function allowanceLine(subscription: Subscription, active: boolean): string {
  const ends = `${active ? "vence" : "venció"} el ${formatListDate(subscription.endsOn)}`;
  const extra = subscription.extraClasses ?? 0;
  const left = subscription.remainingClassAllowance;
  const plan =
    extra > 0
      ? `${left} del plan + ${extra} extra`
      : `${left} de ${subscription.originalClassAllowance} del plan`;
  return `${plan} · ${ends}`;
}

// An ended plan's leftovers cannot be booked, so they are not «disponibles».
function unitLabel(count: number, active: boolean): string {
  if (!active) return count === 1 ? "clase sin usar" : "clases sin usar";
  return count === 1 ? "clase disponible" : "clases disponibles";
}

/**
 * Staff pick E4 A (E-C08): S06's Plan as the screen's 600 hero, white text. The
 * name in small capitals and «Activa» or «Plan vencido», the classes she can
 * still book in Lora, where they come from and when they end, her extra or
 * campaign classes, and the next Plan when one is already paid.
 */
export function ClientPlanCard({
  active,
  nextPlan,
  sells,
  subscription,
}: {
  active: boolean;
  nextPlan: Subscription | null;
  sells: boolean;
  subscription: Subscription;
}) {
  const available = bookableClasses(subscription);
  return (
    <View style={styles.card} testID="client-plan-card">
      <View style={styles.top}>
        <Text style={styles.plan}>{subscription.planName}</Text>
        <Text style={styles.status}>{active ? "Activa" : "Plan vencido"}</Text>
      </View>
      <View style={styles.count}>
        <Text style={styles.number}>{String(available)}</Text>
        <Text style={styles.unit}>{unitLabel(available, active)}</Text>
      </View>
      <Text style={styles.line}>{allowanceLine(subscription, active)}</Text>
      {subscription.extraClassesLine ? (
        <Text style={styles.next}>{subscription.extraClassesLine}</Text>
      ) : null}
      {nextPlan === null ? null : (
        <>
          <View style={styles.rule} />
          {/* Walkthrough finding 117: which Plan is paid, and why no «Registrar pago». */}
          <Text style={styles.next}>
            {`Próximo plan ya pagado: ${nextPlan.planName}, desde el ${formatListDate(nextPlan.startsOn)}.${sells ? " Podrás registrar otro pago cuando empiece." : ""}`}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.emphasis,
    gap: spacing.smd,
    paddingHorizontal: spacing.xlSm,
    paddingVertical: spacing.lgXl,
  },
  count: { alignItems: "baseline", flexDirection: "row", gap: spacing.smLg },
  line: { color: colors.onEmphasis, fontFamily: fontFamilies.body, fontSize: typography.body },
  next: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
  },
  number: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: 44,
    fontVariant: ["tabular-nums"],
    lineHeight: 48,
  },
  plan: {
    color: colors.onEmphasis,
    flex: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
    letterSpacing: typography.label * 0.14,
    textTransform: "uppercase",
  },
  rule: { backgroundColor: colors.onEmphasis, height: 1, marginTop: spacing.sm },
  status: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: "700",
  },
  top: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  unit: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.titleSmall,
    fontWeight: "700",
  },
});
