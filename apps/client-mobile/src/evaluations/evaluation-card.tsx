import type { ClientEvaluationDto } from "@pilates/api-contracts";
import { colors, fontFamilies, spacing, surfaces, typography } from "@pilates/mobile-core";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { evaluationDayAndTime } from "./evaluation-format";

/** «Anteriores» as one Lino group of rows, at the foot of C13 (follow-up 264). */
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
            <Text style={styles.rowLabel}>
              {`${evaluationDayAndTime(evaluation.startsAt)} · ${evaluation.nutritionistName}`}
            </Text>
            <Text style={styles.rowValue}>{label(evaluation)}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: spacing.lg },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
  },
  rowValue: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
});
