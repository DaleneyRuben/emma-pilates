import type { EvaluationAvailabilityDto } from "@pilates/api-contracts";
import { BodyText, colors, radii, spacing, surfaces, typography } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { evaluationDayAndTime, followingMonth, monthName, monthPhrase } from "./evaluation-format";

const nextUnusedMonth = (months: EvaluationAvailabilityDto["months"]): string | null => {
  const lastUsed = [...months].reverse().find((month) => month.status === "used");
  if (lastUsed === undefined) return null;
  const available = months.find(
    (month) => month.status === "available" && month.month > lastUsed.month,
  );
  return available?.month ?? followingMonth(lastUsed.month);
};

export function UsedMonth({ availability }: { availability: EvaluationAvailabilityDto }) {
  const next = nextUnusedMonth(availability.months);
  const usedMonth = availability.months.find((month) => month.status === "used");
  const last = [...availability.months]
    .reverse()
    .find((month) => month.evaluation !== null)?.evaluation;

  return (
    <View style={usedMonthStyles.used}>
      <Text style={usedMonthStyles.usedTitle}>
        {`Ya usaste tu evaluación de ${usedMonth === undefined ? "este mes" : monthPhrase(usedMonth.month)}.`}
      </Text>
      {next !== null ? (
        <BodyText>
          {`Podrás agendar la de ${monthName(next)} desde el 1 de ${monthName(next)}.`}
        </BodyText>
      ) : null}
      {last ? (
        <View style={usedMonthStyles.lastCard}>
          <Text style={usedMonthStyles.label}>Tu última evaluación</Text>
          <BodyText>{evaluationDayAndTime(last.startsAt)}</BodyText>
        </View>
      ) : null}
    </View>
  );
}

export const usedMonthStyles = StyleSheet.create({
  label: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  lastCard: {
    ...surfaces.flatCard,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  used: {
    backgroundColor: "rgba(201,154,78,0.10)",
    borderRadius: radii.inset,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  usedTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
});
