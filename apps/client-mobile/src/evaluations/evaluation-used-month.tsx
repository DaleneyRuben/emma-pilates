import type { EvaluationAvailabilityDto } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  fontFamilies,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
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
        <BodyText style={usedMonthStyles.note}>
          {`Podrás agendar la de ${monthName(next)} desde el 1 de ${monthName(next)}.`}
        </BodyText>
      ) : null}
      {last ? (
        <View style={usedMonthStyles.lastCard}>
          <Text style={usedMonthStyles.label}>Tu última evaluación</Text>
          <BodyText style={usedMonthStyles.lastWhen}>
            {evaluationDayAndTime(last.startsAt)}
          </BodyText>
        </View>
      ) : null}
    </View>
  );
}

export const usedMonthStyles = StyleSheet.create({
  // An 11 pt uppercase label inside a white card or a soft inset.
  label: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 11 * 0.14,
    textTransform: "uppercase",
  },
  // C13u: the last Evaluation on a soft 50 inset inside the white card.
  lastCard: {
    ...surfaces.soft,
    gap: spacing.smd,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  lastWhen: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  note: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  // Rosa Emma (C13n, C13u): a white card with a Lora title.
  used: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lgXl },
  usedTitle: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.section,
    lineHeight: 27,
  },
});
