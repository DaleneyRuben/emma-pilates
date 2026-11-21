import { formatListDate, type ClientOverviewDto } from "@pilates/api-contracts";
import { colors, spacing, surfaces, Text } from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

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
 * name as an `etiqueta` and «Activa» or «Plan vencido», the classes she can
 * still book in `cifra-grande` with their unit in `destacado`, where they come from and when they end, her extra or
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
        <Text style={styles.plan} tone="onDark" variant="etiqueta">
          {subscription.planName}
        </Text>
        <Text tone="onDark" variant="pastilla">
          {active ? "Activa" : "Plan vencido"}
        </Text>
      </View>
      <View style={styles.count}>
        <Text tone="onDark" variant="cifra-grande">
          {String(available)}
        </Text>
        <Text style={styles.unit} tone="onDark" variant="destacado">
          {unitLabel(available, active)}
        </Text>
      </View>
      <Text tone="onDark" variant="cuerpo">
        {allowanceLine(subscription, active)}
      </Text>
      {subscription.extraClassesLine ? (
        <Text tone="onDark" variant="cuerpo">
          {subscription.extraClassesLine}
        </Text>
      ) : null}
      {nextPlan === null ? null : (
        <>
          <View style={styles.rule} />
          {/* Walkthrough finding 117: which Plan is paid, and why no «Registrar pago». */}
          <Text tone="onDark" variant="cuerpo">
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
  plan: { flex: 1 },
  rule: { backgroundColor: colors.onEmphasis, height: 1, marginTop: spacing.sm },
  top: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  unit: { flexShrink: 1 },
});
