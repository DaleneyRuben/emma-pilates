import { formatListDate, type ClientOverviewDto } from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  colors,
  fontFamilies,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { bookableClasses } from "./bookable-classes";

type Subscription = NonNullable<ClientOverviewDto["subscription"]["subscription"]>;
type Freeze = NonNullable<ClientOverviewDto["subscription"]["freeze"]>;

/**
 * FIX-090 (audit C3): the plan's Freeze, so front desk can say why a day
 * cannot be booked; nothing once it ended, or when refused or withdrawn.
 */
function freezeLine(freeze: Freeze | null | undefined, today: string): string | null {
  if (freeze == null || freeze.endsOn < today) return null;
  const days = `del ${formatListDate(freeze.startsOn)} al ${formatListDate(freeze.endsOn)}`;
  if (freeze.state === "approved") return `Congelado ${days}: esos días no puede reservar.`;
  if (freeze.state === "requested") return `Pidió congelar ${days}; está por revisar.`;
  return null;
}

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
 * FIX-083 (Ficha pick A): S06's Plan on one quiet Lino card: the name and a
 * small status dot, the classes she can still book in Lora 40, where they come
 * from and when they end, and the next Plan when one is already paid.
 */
export function ClientPlanCard({
  active,
  freeze,
  nextPlan,
  sells,
  subscription,
}: {
  active: boolean;
  freeze?: Freeze | null;
  nextPlan: Subscription | null;
  sells: boolean;
  subscription: Subscription;
}) {
  const available = bookableClasses(subscription);
  const frozen = freezeLine(freeze, boliviaCivilDate(new Date()));
  return (
    <View style={styles.card} testID="client-plan-card">
      <View style={styles.top}>
        <Text style={styles.plan}>{subscription.planName}</Text>
        <View style={styles.status}>
          <View style={[styles.dot, !active && styles.dotEnded]} />
          <Text style={[styles.statusLabel, !active && styles.statusEnded]}>
            {active ? "Plan activo" : "Plan vencido"}
          </Text>
        </View>
      </View>
      <View style={styles.count}>
        <Text style={styles.number}>{String(available)}</Text>
        <Text style={styles.unit}>{unitLabel(available, active)}</Text>
      </View>
      <Text style={styles.quiet}>{allowanceLine(subscription, active)}</Text>
      {subscription.extraClassesLine ? (
        <Text style={styles.quiet}>{subscription.extraClassesLine}</Text>
      ) : null}
      {frozen === null ? null : <Text style={styles.next}>{frozen}</Text>}
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
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lgXl },
  count: { alignItems: "baseline", flexDirection: "row", gap: spacing.sm },
  dot: { backgroundColor: colors.success, borderRadius: radii.pill, height: 7, width: 7 },
  dotEnded: { backgroundColor: colors.borderStrong },
  next: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  number: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
  },
  plan: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: typography.body },
  quiet: { color: colors.textSubtle, fontFamily: fontFamilies.body, fontSize: typography.note },
  rule: { backgroundColor: colors.hairline, height: 1 },
  status: { alignItems: "center", flexDirection: "row", gap: spacing.smd },
  statusEnded: { color: colors.textMuted },
  statusLabel: {
    color: colors.successText,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
  },
  top: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  unit: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.body },
});
