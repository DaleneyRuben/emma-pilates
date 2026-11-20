import type { ClientEvaluationDto } from "@pilates/api-contracts";
import {
  BodyText,
  boliviaCivilDate,
  colors,
  fontFamilies,
  initials,
  OutlinedButton,
  PrimaryButton,
  radii,
  spacing,
  surfaces,
  typography,
  useMountedAt,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  appointmentLead,
  appointmentPayment,
  appointmentWhen,
} from "./evaluation-appointment-format";
import { clockTime, evaluationDate } from "./evaluation-format";
import { nextEvaluationState } from "./next-evaluation-state";

/** A white action inside the 600 block (C13c, C13d). */
function BlockButton({
  accessibilityLabel,
  label,
  onPress,
  outlined,
}: {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
  /** On a white card the action keeps a 400 outline. */
  outlined: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.blockButton,
        outlined && styles.blockButtonOutlined,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.blockButtonLabel}>{label}</Text>
    </Pressable>
  );
}

/**
 * C5 pick C «Todo en la cita»: the appointment in the 600 hero,
 * «Tu cita · en N días», the date and time in Lora, the Nutritionist's
 * initials with the Branch and the duration, what she pays and «llega 10 min
 * antes», with «Cambiar fecha» and «Cancelar» inside. The state's line sits
 * on a white card under it. A slot the studio released draws a white card with
 * the time struck through and the exception on a 600 pill, then the line and
 * «Elegir turno» on their own white card (C13g). `secondary` draws a later
 * appointment on a white card, since the screen keeps one hero (C15).
 */
export function NextEvaluationCard({
  evaluation,
  moving,
  onAttachReceipt,
  onCancel,
  onMove,
  secondary = false,
  uploading,
}: {
  evaluation: ClientEvaluationDto;
  /** She is choosing its new slot: the actions step aside. */
  moving: boolean;
  onAttachReceipt: () => void;
  onCancel: () => void;
  onMove: () => void;
  /** A later appointment: a white card, not the hero (C15). */
  secondary?: boolean;
  uploading: boolean;
}) {
  const shownAt = useMountedAt();
  const state = nextEvaluationState(evaluation, shownAt);

  if (state.released) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.releasedCard} testID="next-evaluation">
          <Text style={styles.releasedEyebrow}>{evaluationDate(evaluation.startsAt)}</Text>
          <Text style={styles.releasedTime}>{clockTime(evaluation.startsAt)}</Text>
          <Text style={styles.releasedDetails}>
            {`${evaluation.durationMinutes} minutos · ${evaluation.nutritionistName} · ${evaluation.branchName}`}
          </Text>
          <View style={styles.releasedPill} testID="exception-pill">
            <Text style={styles.releasedPillText}>{state.chip}</Text>
          </View>
        </View>
        <View style={[styles.lineCard, styles.releasedNext]}>
          <BodyText style={styles.line}>{state.line}</BodyText>
          {moving ? null : <PrimaryButton label="Elegir turno" onPress={onMove} />}
        </View>
      </View>
    );
  }

  const today = boliviaCivilDate(new Date(shownAt));
  const showActions = !moving && (state.needsReceipt || state.canMove || state.canCancel);
  return (
    <View style={styles.wrapper}>
      <View style={secondary ? styles.cardBlock : styles.block} testID="next-evaluation">
        <Text style={[styles.eyebrow, secondary && styles.onCard]}>
          {appointmentLead(evaluation.startsAt, today)}
        </Text>
        <Text style={[styles.when, secondary && styles.whenOnCard]}>
          {appointmentWhen(evaluation.startsAt)}
        </Text>
        <View style={styles.person}>
          <View style={[styles.initials, secondary && styles.initialsOnCard]}>
            <Text allowFontScaling={false} style={styles.initialsText}>
              {initials(evaluation.nutritionistName)}
            </Text>
          </View>
          <Text style={[styles.personText, secondary && styles.smallOnCard]}>
            {`${evaluation.nutritionistName} · ${evaluation.branchName} · ${evaluation.durationMinutes} min`}
          </Text>
        </View>
        <Text
          style={[styles.payment, secondary && styles.smallOnCard]}
        >{`${appointmentPayment(evaluation)} · llega 10 min antes`}</Text>
        {showActions ? (
          <View style={styles.actions}>
            {state.needsReceipt ? (
              <OutlinedButton
                busy={uploading}
                label="Sube tu comprobante de transferencia"
                onPress={onAttachReceipt}
              />
            ) : null}
            {state.canMove || state.canCancel ? (
              <View style={styles.actionRow}>
                {state.canMove ? (
                  <BlockButton
                    accessibilityLabel="Cambiar fecha"
                    label="Cambiar fecha"
                    onPress={onMove}
                    outlined={secondary}
                  />
                ) : null}
                {state.canCancel ? (
                  <BlockButton
                    accessibilityLabel="Cancelar evaluación"
                    label="Cancelar"
                    onPress={onCancel}
                    outlined={secondary}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={styles.lineCard}>
        <BodyText style={styles.line}>{state.line}</BodyText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  block: { ...surfaces.emphasis, gap: spacing.sm, padding: spacing.xlSm },
  blockButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.button,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  blockButtonOutlined: { borderColor: colors.borderStrong, borderWidth: 1.5 },
  blockButtonLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: "700",
  },
  cardBlock: { ...surfaces.card, gap: spacing.xs, padding: spacing.lg },
  eyebrow: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 11 * 0.14,
    textTransform: "uppercase",
  },
  initials: {
    alignItems: "center",
    backgroundColor: colors.onEmphasis,
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  initialsOnCard: { backgroundColor: colors.primaryTint },
  initialsText: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: "700",
  },
  line: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  // The state's line on its own white card under the block.
  lineCard: {
    ...surfaces.card,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  onCard: { color: colors.text },
  payment: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  person: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  personText: {
    color: colors.onEmphasis,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  pressed: { opacity: 0.85 },
  releasedCard: { ...surfaces.card, gap: spacing.sm, padding: spacing.lgXl },
  releasedDetails: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
  releasedEyebrow: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 11 * 0.14,
    textTransform: "uppercase",
  },
  releasedNext: { padding: spacing.lg },
  releasedPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.emphasis,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: spacing.md,
  },
  releasedPillText: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
  },
  releasedTime: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
    lineHeight: 44,
    textDecorationLine: "line-through",
  },
  smallOnCard: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 18,
  },
  when: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: typography.hero,
    fontVariant: ["tabular-nums"],
    lineHeight: 31,
  },
  whenOnCard: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.section,
    lineHeight: 27,
  },
  wrapper: { gap: spacing.md },
});
