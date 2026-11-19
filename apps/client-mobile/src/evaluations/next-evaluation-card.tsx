import type { ClientEvaluationDto } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  EmphasisCard,
  ExceptionPill,
  fontFamilies,
  formatBolivianos,
  OutlinedButton,
  PrimaryButton,
  spacing,
  surfaces,
  typography,
  useMountedAt,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { clockTime, evaluationDate, paidEvaluationLabel } from "./evaluation-format";

type CardState = {
  chip: string;
  line: string;
  released: boolean;
  canCancel: boolean;
  canMove: boolean;
  needsReceipt: boolean;
};

/** What the card says and offers for one booked Evaluation (follow-up 264 §1). */
export function nextEvaluationState(evaluation: ClientEvaluationDto, shownAt: number): CardState {
  // The server's flags are a snapshot; the 3-hour limit is judged again here.
  const open = new Date(evaluation.cancellableUntil).getTime() > shownAt;
  const amount = formatBolivianos(evaluation.priceCentavos);
  const base = { canCancel: false, canMove: false, needsReceipt: false, released: false };
  if (evaluation.slotReleased === true) {
    return {
      ...base,
      chip: "El estudio liberó tu turno",
      line: `Tu pago de ${amount} sigue vigente: elige otro turno y no pagas de nuevo.`,
      released: true,
    };
  }
  if (evaluation.included) {
    const canCancel = evaluation.cancellable && open;
    return {
      ...base,
      canCancel,
      chip: "Gratis con tu plan",
      line: canCancel ? "Puedes cancelarla hasta 3 horas antes." : "Ya no se puede cancelar.",
    };
  }
  // Finding 64: the server says what a paid one allows; with the transfer in
  // review she may move it and, while the studio has not confirmed, cancel it.
  const canMove = evaluation.reschedulable === true && open;
  const canCancel = evaluation.cancellable && open;
  const needsReceipt = evaluation.receiptUploadable === true;
  const chip = paidEvaluationLabel(evaluation.paymentState);
  const line = needsReceipt
    ? `Sube tu comprobante de ${amount} para que el estudio revise tu pago.`
    : evaluation.paymentState === "pending"
      ? `El estudio revisa tu comprobante de ${amount} y te avisa por la app.`
      : evaluation.paymentState === "rejected"
        ? `El estudio no aprobó tu comprobante de ${amount}.`
        : canMove
          ? "Puedes reprogramarla hasta 3 horas antes. El pago sigue con ella."
          : canCancel
            ? "Puedes cancelarla hasta 3 horas antes."
            : "Ya no se puede reprogramar.";
  return { ...base, canCancel, canMove, chip, line, needsReceipt };
}

/**
 * Option A's «Tu próxima evaluación»: C14's hero with its state as a Crema
 * line (palette B: a normal state is words, FIX-089), one line under it and
 * full-width actions. A slot the studio released draws the card in Crema
 * with the time struck through and the exception on the Rubor pill.
 */
export function NextEvaluationCard({
  evaluation,
  moving,
  onAttachReceipt,
  onCancel,
  onMove,
  uploading,
}: {
  evaluation: ClientEvaluationDto;
  /** She is choosing its new slot: the actions step aside. */
  moving: boolean;
  onAttachReceipt: () => void;
  onCancel: () => void;
  onMove: () => void;
  uploading: boolean;
}) {
  const state = nextEvaluationState(evaluation, useMountedAt());
  const eyebrow = evaluationDate(evaluation.startsAt);
  const time = clockTime(evaluation.startsAt);
  const details = `${evaluation.durationMinutes} minutos · ${evaluation.nutritionistName} · ${evaluation.branchName}`;

  return (
    <View style={styles.block}>
      {state.released ? (
        <View style={styles.releasedCard} testID="next-evaluation">
          <Text style={styles.releasedEyebrow}>{eyebrow}</Text>
          <Text style={[styles.time, styles.releasedTime]}>{time}</Text>
          <Text style={styles.releasedDetails}>{details}</Text>
          <ExceptionPill>{state.chip}</ExceptionPill>
        </View>
      ) : (
        <EmphasisCard eyebrow={eyebrow} testID="next-evaluation">
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.details}>{details}</Text>
          <Text style={styles.state}>{state.chip}</Text>
        </EmphasisCard>
      )}
      <BodyText style={styles.line}>{state.line}</BodyText>
      {moving ? null : (
        <View style={styles.actions}>
          {state.released ? <PrimaryButton label="Elegir turno" onPress={onMove} /> : null}
          {state.needsReceipt ? (
            <OutlinedButton
              busy={uploading}
              label="Sube tu comprobante de transferencia"
              onPress={onAttachReceipt}
            />
          ) : null}
          {state.canMove ? <OutlinedButton label="Reprogramar" onPress={onMove} /> : null}
          {state.canCancel ? (
            <OutlinedButton label="Cancelar evaluación" onPress={onCancel} tone="error" />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  block: { gap: spacing.md },
  details: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
  },
  line: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
  releasedCard: { ...surfaces.card, gap: spacing.md, padding: spacing.xlSm },
  releasedDetails: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 15 },
  releasedEyebrow: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  releasedTime: { color: colors.text, textDecorationLine: "line-through" },
  state: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "600",
  },
  time: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
    lineHeight: 44,
  },
});
