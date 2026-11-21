import type { EvaluationAvailabilityDto } from "@pilates/api-contracts";
import { spacing, surfaces, Text } from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

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
      <Text variant="titulo-fila">
        {`Ya usaste tu evaluación de ${usedMonth === undefined ? "este mes" : monthPhrase(usedMonth.month)}.`}
      </Text>
      {next !== null ? (
        <Text variant="cuerpo">
          {`Podrás agendar la de ${monthName(next)} desde el 1 de ${monthName(next)}.`}
        </Text>
      ) : null}
      {last ? (
        <View style={usedMonthStyles.lastCard}>
          <Text variant="etiqueta">Tu última evaluación</Text>
          <Text variant="titulo-fila">{evaluationDayAndTime(last.startsAt)}</Text>
        </View>
      ) : null}
    </View>
  );
}

export const usedMonthStyles = StyleSheet.create({
  // C13u: the last Evaluation on a soft 50 inset inside the white card.
  lastCard: {
    ...surfaces.soft,
    gap: spacing.smd,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  // Rosa Emma (C13n, C13u): a white card whose first line is a row title.
  used: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lgXl },
});
