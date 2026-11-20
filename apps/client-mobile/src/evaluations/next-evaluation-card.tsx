import type { ClientEvaluationDto } from "@pilates/api-contracts";
import {
  BodyText,
  boliviaCivilDate,
  colors,
  ExceptionPill,
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

/** A Crema-outlined action inside the Palo de rosa block. */
function BlockButton({
  accessibilityLabel,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.blockButton, pressed && styles.pressed]}
    >
      <Text style={styles.blockButtonLabel}>{label}</Text>
    </Pressable>
  );
}

/**
 * C5 pick C «Todo en la cita»: the appointment in one Palo de rosa block,
 * «Tu cita · en N días», the date and time in Lora, the Nutritionist's
 * initials with the Branch and the duration, what she pays and «llega 10 min
 * antes», with «Cambiar fecha» and «Cancelar» inside. The state's line stays
 * under it. A slot the studio released draws the card in Crema with the time
 * struck through and the exception on the Rubor pill.
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
          <ExceptionPill>{state.chip}</ExceptionPill>
        </View>
        <BodyText style={styles.line}>{state.line}</BodyText>
        {moving ? null : <PrimaryButton label="Elegir turno" onPress={onMove} />}
      </View>
    );
  }

  const today = boliviaCivilDate(new Date(shownAt));
  const showActions = !moving && (state.needsReceipt || state.canMove || state.canCancel);
  return (
    <View style={styles.wrapper}>
      <View style={styles.block} testID="next-evaluation">
        <Text style={styles.eyebrow}>{appointmentLead(evaluation.startsAt, today)}</Text>
        <Text style={styles.when}>{appointmentWhen(evaluation.startsAt)}</Text>
        <View style={styles.person}>
          <View style={styles.initials}>
            <Text allowFontScaling={false} style={styles.initialsText}>
              {initials(evaluation.nutritionistName)}
            </Text>
          </View>
          <Text style={styles.personText}>
            {`${evaluation.nutritionistName} · ${evaluation.branchName} · ${evaluation.durationMinutes} min`}
          </Text>
        </View>
        <Text
          style={styles.payment}
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
                  />
                ) : null}
                {state.canCancel ? (
                  <BlockButton
                    accessibilityLabel="Cancelar evaluación"
                    label="Cancelar"
                    onPress={onCancel}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <BodyText style={styles.line}>{state.line}</BodyText>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  block: { ...surfaces.emphasis, gap: spacing.smd, padding: spacing.xlSm },
  blockButton: {
    alignItems: "center",
    borderColor: colors.onEmphasis,
    borderRadius: radii.button,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  blockButtonLabel: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    fontWeight: "600",
  },
  eyebrow: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "600",
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
  initialsText: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "700",
  },
  line: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
  payment: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "600",
    lineHeight: 18,
  },
  person: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  personText: {
    color: colors.onEmphasis,
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    fontWeight: "500",
  },
  pressed: { opacity: 0.85 },
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
  releasedTime: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
    lineHeight: 44,
    textDecorationLine: "line-through",
  },
  when: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: 26,
    fontVariant: ["tabular-nums"],
    lineHeight: 30,
  },
  wrapper: { gap: spacing.md },
});
