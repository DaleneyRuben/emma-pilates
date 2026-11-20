import type { ClientEvaluationDto } from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  colors,
  initials,
  OutlinedButton,
  PrimaryButton,
  radii,
  spacing,
  surfaces,
  Text,
  useMountedAt,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

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
      <Text variant="boton-chico">{label}</Text>
    </Pressable>
  );
}

/**
 * C5 pick C «Todo en la cita»: the appointment in the 600 hero,
 * «Tu cita · en N días», the date and time as the block's title, the Nutritionist's
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
          <Text variant="etiqueta">{evaluationDate(evaluation.startsAt)}</Text>
          <Text strike variant="cifra-grande">
            {clockTime(evaluation.startsAt)}
          </Text>
          <Text variant="cuerpo">
            {`${evaluation.durationMinutes} minutos · ${evaluation.nutritionistName} · ${evaluation.branchName}`}
          </Text>
          <View style={styles.releasedPill} testID="exception-pill">
            <Text tone="onDark" variant="pastilla">
              {state.chip}
            </Text>
          </View>
        </View>
        <View style={[styles.lineCard, styles.releasedNext]}>
          <Text variant="cuerpo">{state.line}</Text>
          {moving ? null : <PrimaryButton label="Elegir turno" onPress={onMove} />}
        </View>
      </View>
    );
  }

  const today = boliviaCivilDate(new Date(shownAt));
  const showActions = !moving && (state.needsReceipt || state.canMove || state.canCancel);
  // White on the 600 hero; ink on a later appointment's white card.
  const tone = secondary ? "ink" : "onDark";
  return (
    <View style={styles.wrapper}>
      <View style={secondary ? styles.cardBlock : styles.block} testID="next-evaluation">
        <Text tone={tone} variant="etiqueta">
          {appointmentLead(evaluation.startsAt, today)}
        </Text>
        <Text tone={tone} variant="titulo-bloque">
          {appointmentWhen(evaluation.startsAt)}
        </Text>
        <View style={styles.person}>
          <View style={[styles.initials, secondary && styles.initialsOnCard]}>
            <Text allowFontScaling={false} variant="pastilla">
              {initials(evaluation.nutritionistName)}
            </Text>
          </View>
          <Text style={styles.personText} tone={tone} variant="cuerpo">
            {`${evaluation.nutritionistName} · ${evaluation.branchName} · ${evaluation.durationMinutes} min`}
          </Text>
        </View>
        <Text tone={tone} variant="titulo-fila">
          {`${appointmentPayment(evaluation)} · llega 10 min antes`}
        </Text>
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
        <Text variant="cuerpo">{state.line}</Text>
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
  cardBlock: { ...surfaces.card, gap: spacing.xs, padding: spacing.lg },
  initials: {
    alignItems: "center",
    backgroundColor: colors.onEmphasis,
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  initialsOnCard: { backgroundColor: colors.primaryTint },
  // The state's line on its own white card under the block.
  lineCard: {
    ...surfaces.card,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  person: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  personText: { flex: 1 },
  pressed: { opacity: 0.85 },
  releasedCard: { ...surfaces.card, gap: spacing.sm, padding: spacing.lgXl },
  releasedNext: { padding: spacing.lg },
  releasedPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.emphasis,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: spacing.md,
  },
  wrapper: { gap: spacing.md },
});
