import type { ClientEvaluationDto } from "@pilates/api-contracts";
import { colors, fontFamilies, spacing, surfaces, typography } from "@pilates/mobile-core";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

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
  rowLabel: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
  },
  rowValue: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "600",
  },
});
