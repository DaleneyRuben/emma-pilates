import type { ClientEvaluationDto } from "@pilates/api-contracts";
import {
  BodyText,
  CardActionRow,
  cardWithActionRow,
  colors,
  fontFamilies,
  radii,
  spacing,
  surfaces,
  typography,
  useMountedAt,
} from "@pilates/mobile-core";
import { Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { clockTime, evaluationBadge, evaluationDayAndTime } from "./evaluation-format";

function DateTile({ instant }: { instant: string }) {
  const badge = evaluationBadge(instant);
  return (
    <View style={styles.tile}>
      <Text style={styles.tileMonth}>{badge.month}</Text>
      <Text style={styles.tileDay}>{badge.day}</Text>
    </View>
  );
}

/**
 * C15's upcoming Evaluation (follow-up 226): the date tile, «09:30 ·
 * Nutritionist» in Lora 20, one line with the limit, and the action as a
 * text button under a hairline.
 */
export function UpcomingEvaluationCard({
  evaluation,
  onAttachReceipt,
  onCancel,
  onReschedule,
  uploading,
}: {
  evaluation: ClientEvaluationDto;
  onAttachReceipt: () => void;
  onCancel: () => void;
  onReschedule: () => void;
  uploading: boolean;
}) {
  // The server's flag is a snapshot; the 3-hour limit is judged again when the card appears.
  const shownAt = useMountedAt();
  const open = new Date(evaluation.cancellableUntil).getTime() > shownAt;
  const cancellable = evaluation.cancellable && open;
  const reschedulable = evaluation.reschedulable === true && open;
  const lead = evaluation.included ? `${evaluation.durationMinutes} min` : "Pagada";
  const limit = reschedulable
    ? "reprograma hasta 3 h antes"
    : cancellable
      ? "cancela hasta 3 h antes"
      : "ya no se puede cancelar";
  const actions = [
    evaluation.receiptUploadable === true ? (
      <View style={styles.actionRow}>
        <Pressable
          accessibilityLabel="Sube tu comprobante de transferencia"
          accessibilityRole="button"
          accessibilityState={{ busy: uploading, disabled: uploading }}
          disabled={uploading}
          onPress={onAttachReceipt}
          style={styles.action}
        >
          <Text style={styles.actionLabel}>
            {uploading ? "Subiendo comprobante…" : "Sube tu comprobante de transferencia"}
          </Text>
        </Pressable>
      </View>
    ) : null,
    reschedulable ? (
      <CardActionRow label="Reprogramar" onPress={onReschedule} />
    ) : cancellable ? (
      <CardActionRow label="Cancelar evaluación" onPress={onCancel} tone="error" />
    ) : null,
  ].filter((action) => action !== null);

  return (
    <View style={[styles.card, actions.length > 0 && cardWithActionRow]}>
      <View style={styles.header}>
        <DateTile instant={evaluation.startsAt} />
        <View style={styles.body}>
          <Text style={styles.title}>
            {`${clockTime(evaluation.startsAt)} · ${evaluation.nutritionistName}`}
          </Text>
          <Text style={styles.details}>{`${lead} · ${limit}`}</Text>
          {!evaluation.included && evaluation.receiptAttached === true ? (
            <BodyText style={styles.details}>Comprobante listo.</BodyText>
          ) : null}
        </View>
      </View>
      {actions.map((action, index) => (
        <Fragment key={index}>{action}</Fragment>
      ))}
    </View>
  );
}

/** C15's «Anteriores» as one Lino group of rows. */
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
  // The receipt action keeps one accessible name while its text says «Subiendo».
  action: { justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md },
  actionLabel: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  actionRow: {
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  body: { flex: 1, gap: spacing.xxs },
  card: { ...surfaces.card, gap: spacing.sm, padding: spacing.lg },
  details: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  group: { ...surfaces.card },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: spacing.lg },
  header: { alignItems: "center", flexDirection: "row", gap: spacing.md },
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
  tile: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.button,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  tileDay: { color: colors.primaryOnTint, fontFamily: fontFamilies.display, fontSize: 20 },
  tileMonth: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.tabLabel,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  title: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 20 },
});
