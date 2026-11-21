import type { ClientEvaluationDto } from "@pilates/api-contracts";
import { colors, spacing, surfaces, Text } from "@pilates/mobile-core";
import { Fragment } from "react";
import { StyleSheet, View } from "react-native";

import { evaluationDayAndTime } from "./evaluation-format";

/** «Anteriores» as one white card of rows, at the foot of C13 (follow-up 264). */
export function PastEvaluations({
  evaluations,
  label,
}: {
  evaluations: readonly ClientEvaluationDto[];
  label: (evaluation: ClientEvaluationDto) => string;
}) {
  return (
    <View style={styles.group}>
      {evaluations.map((evaluation, index) => (
        <Fragment key={evaluation.id}>
          {index === 0 ? null : <View style={styles.hairline} />}
          <View style={styles.row}>
            <Text style={styles.rowLabel} variant="cuerpo">
              {`${evaluationDayAndTime(evaluation.startsAt)} · ${evaluation.nutritionistName}`}
            </Text>
            <Text variant="pastilla">{label(evaluation)}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { ...surfaces.card, overflow: "hidden" },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  rowLabel: { flex: 1 },
});
