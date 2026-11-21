import type { ClientEvaluationDto, EvaluationAvailabilityDto } from "@pilates/api-contracts";
import { spacing, surfaces, Text } from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

import { clockTime, evaluationDate } from "./evaluation-format";
import { UsedMonth, usedMonthStyles } from "./evaluation-used-month";

// "jueves 3 de septiembre, 16:00", read mid-sentence.
const turno = (instant: string) => {
  const date = evaluationDate(instant);
  return `${date.charAt(0).toLowerCase()}${date.slice(1)}, ${clockTime(instant)}`;
};

/**
 * The note over the turnos while she moves an Evaluation (follow-up 264): a
 * white card with «Volver» as a standalone `enlace` under the line (C13v).
 */
export function MovingBand({
  evaluation,
  onBack,
}: {
  evaluation: ClientEvaluationDto;
  onBack: () => void;
}) {
  return (
    <View style={styles.band}>
      <Text variant="cuerpo">
        {`Cambias tu cita del ${turno(evaluation.startsAt)}. Elige el nuevo horario.`}
      </Text>
      <Pressable
        accessibilityLabel="Volver a tu cita"
        accessibilityRole="button"
        onPress={onBack}
        style={styles.bandButton}
      >
        <Text variant="enlace">Volver</Text>
      </Pressable>
    </View>
  );
}

export function NoSlots({
  availability,
  showUsed,
}: {
  availability: EvaluationAvailabilityDto;
  showUsed: boolean;
}) {
  if (showUsed) return <UsedMonth availability={availability} />;
  return (
    <View style={usedMonthStyles.used}>
      <Text variant="titulo-fila">No hay horarios disponibles por ahora.</Text>
      <Text variant="cuerpo">Vuelve a revisar en unos días.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    ...surfaces.card,
    alignItems: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.mdLg,
    paddingBottom: spacing.xs,
  },
  bandButton: { justifyContent: "center", minHeight: 44 },
});
