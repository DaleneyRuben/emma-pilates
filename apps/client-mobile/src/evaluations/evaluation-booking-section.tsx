import type {
  ClientEvaluationDto,
  EvaluationAvailabilityDto,
  EvaluationSlotDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  fontFamilies,
  QueryFailure,
  SectionTitle,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { NextSlots } from "./evaluation-next-slots";
import { MovingBand, NoSlots } from "./evaluation-screen-parts";
import { EvaluationSlotPicker, type OpenDay } from "./evaluation-slot-picker";

/**
 * The slots under her appointments. While she moves one, the full calendar.
 * With an appointment booked, C5 pick C's «¿Otra evaluación?»: the next
 * three slots and «Ver más días» to the full calendar. With none, the
 * calendar as before.
 */
export function EvaluationBookingSection({
  availability,
  booked,
  days,
  failure,
  hasPlan,
  moving,
  offer,
  onPick,
  onPlans,
  onRetry,
  onStopMoving,
}: {
  availability: EvaluationAvailabilityDto | null;
  /** She has an upcoming Evaluation. */
  booked: boolean;
  days: OpenDay[];
  failure: ReactNode;
  hasPlan: boolean;
  moving: ClientEvaluationDto | null;
  offer: string | null;
  onPick: (slot: EvaluationSlotDto) => void;
  onPlans: () => void;
  onRetry: () => void;
  onStopMoving: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const quick = booked && moving === null && !expanded;
  const canBook = availability !== null && (moving !== null || hasPlan) && days.length > 0;
  // Her Plan's offer (finding 69) stays, quietly: under the three boxes, or
  // over the calendar as before.
  const offerLine =
    booked && moving === null && offer !== null ? (
      <BodyText style={styles.muted}>{offer}</BodyText>
    ) : null;

  return (
    <View style={styles.section}>
      {booked && moving === null ? (
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            ¿Otra evaluación?
          </Text>
          {quick && canBook ? (
            <TextButton label="Ver más días" onPress={() => setExpanded(true)} />
          ) : null}
        </View>
      ) : (
        <SectionTitle>
          {moving !== null ? "Elige el nuevo horario" : "Reserva tu evaluación"}
        </SectionTitle>
      )}
      {moving !== null ? (
        <>
          <MovingBand evaluation={moving} onBack={onStopMoving} />
          {failure}
        </>
      ) : null}
      {quick && canBook ? null : offerLine}
      {availability === null ? (
        <QueryFailure label="No pudimos cargar los horarios de evaluación." onRetry={onRetry} />
      ) : moving === null && !hasPlan ? (
        <>
          <BodyText>Necesitas un plan activo para reservar.</BodyText>
          <TextButton label="Ver planes" onPress={onPlans} />
        </>
      ) : days.length === 0 ? (
        <NoSlots
          availability={availability}
          showUsed={moving === null && availability.months.some((m) => m.status === "used")}
        />
      ) : (
        <>
          {quick ? <NextSlots days={days} onPick={onPick} /> : null}
          {quick ? offerLine : null}
          {quick ? null : <EvaluationSlotPicker days={days} onPick={onPick} />}
          <BodyText style={styles.muted}>
            {moving === null
              ? "Puedes reservar hasta 3 horas antes."
              : "Puedes reprogramarla hasta 3 horas antes."}
          </BodyText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  muted: { color: colors.textMuted, fontSize: typography.note, fontFamily: fontFamilies.body },
  section: { gap: spacing.md },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "600",
    letterSpacing: typography.label * 0.14,
    textTransform: "uppercase",
  },
});
