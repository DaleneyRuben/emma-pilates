import type { EvaluationSlotDto } from "@pilates/api-contracts";
import { BodyText, ConfirmationSheet, colors } from "@pilates/mobile-core";
import { StyleSheet } from "react-native";

import { clockTime, evaluationDate } from "./evaluation-format";

// "jueves 3 de septiembre, 16:00": the sheet reads it mid-sentence.
const turno = (instant: string): string => {
  const date = evaluationDate(instant);
  return `${date.charAt(0).toLowerCase()}${date.slice(1)}, ${clockTime(instant)}`;
};

/**
 * Follow-up 218 §4: before a paid Evaluation moves, the Client sees the old
 * and the new turno and that the payment stays; «Volver» moves nothing.
 */
export function RescheduleConfirmSheet({
  busy,
  currentStartsAt,
  onConfirm,
  onDismiss,
  target,
}: {
  busy: boolean;
  currentStartsAt: string | undefined;
  onConfirm: () => void;
  onDismiss: () => void;
  target: EvaluationSlotDto | null;
}) {
  return (
    <ConfirmationSheet
      busy={busy}
      confirmLabel="Sí, mover evaluación"
      note="El horario anterior queda libre para otras clientas."
      onConfirm={onConfirm}
      onDismiss={onDismiss}
      testID="reschedule-evaluation-sheet"
      title="¿Mover tu evaluación?"
      tone="primary"
      visible={target !== null}
    >
      {target !== null ? (
        <>
          {currentStartsAt === undefined ? null : (
            <BodyText>{`Antes: ${turno(currentStartsAt)}`}</BodyText>
          )}
          <BodyText style={styles.now}>{`Ahora: ${turno(target.startsAt)}`}</BodyText>
          <BodyText>{`${target.durationMinutes} min · ${target.nutritionistName}`}</BodyText>
          <BodyText>El pago se mantiene: no pagas de nuevo.</BodyText>
        </>
      ) : null}
    </ConfirmationSheet>
  );
}

const styles = StyleSheet.create({
  now: { color: colors.text, fontWeight: "500" },
});
