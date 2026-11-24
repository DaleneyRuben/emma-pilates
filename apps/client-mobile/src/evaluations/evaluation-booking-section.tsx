import type {
  ClientEvaluationDto,
  EvaluationAvailabilityDto,
  EvaluationSlotDto,
} from "@pilates/api-contracts";
import {
  QueryFailure,
  SectionTitle,
  spacing,
  surfaces,
  Text,
  TextButton,
} from "@pilates/mobile-core";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { NextSlots } from "./evaluation-next-slots";
import { MovingBand, NoSlots } from "./evaluation-screen-parts";
import { EvaluationSlotPicker, SoleNutritionist, type OpenDay } from "./evaluation-slot-picker";

/**
 * The slots under her appointments. While she moves one, the full calendar.
 * With an appointment booked, C5 pick C's «¿Otra evaluación?»: the next
 * three slots and «Ver más días» to the full calendar, all on one white
 * card (C13d). With none, the Nutritionist's card, «Reserva tu evaluación»
 * and the calendar on its white card (C13).
 */
export function EvaluationBookingSection({
  availability,
  booked,
  days,
  failure,
  hasPlan,
  moving,
  nutritionistApart = false,
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
  /** 13T: a tablet shows the Nutritionist's card in the column beside. */
  nutritionistApart?: boolean;
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
    booked && moving === null && offer !== null ? <Text variant="secundario">{offer}</Text> : null;

  const otherOne = booked && moving === null;
  const note = (
    <Text variant="secundario">
      {moving === null
        ? "Puedes reservar hasta 3 horas antes."
        : "Puedes reprogramarla hasta 3 horas antes."}
    </Text>
  );
  const body =
    availability === null ? (
      <QueryFailure label="No pudimos cargar los horarios de evaluación." onRetry={onRetry} />
    ) : moving === null && !hasPlan ? (
      <View style={otherOne ? styles.inCard : styles.card}>
        <Text variant="cuerpo">Necesitas un plan activo para reservar.</Text>
        <TextButton label="Ver planes" onPress={onPlans} style={styles.link} />
      </View>
    ) : days.length === 0 ? (
      <NoSlots
        availability={availability}
        showUsed={moving === null && availability.months.some((m) => m.status === "used")}
      />
    ) : quick ? (
      <>
        <NextSlots days={days} onPick={onPick} />
        {offerLine}
        {note}
      </>
    ) : (
      <EvaluationSlotPicker days={days} footer={note} onPick={onPick} plain={otherOne} />
    );

  if (otherOne) {
    return (
      <View style={styles.card} testID="evaluation-other">
        <View style={styles.header}>
          <Text accessibilityRole="header" variant="etiqueta">
            ¿Otra evaluación?
          </Text>
          {quick && canBook ? (
            <Pressable
              accessibilityLabel="Ver más días"
              accessibilityRole="button"
              hitSlop={spacing.sm}
              onPress={() => setExpanded(true)}
              style={styles.more}
            >
              <Text variant="enlace">Ver más días</Text>
            </Pressable>
          ) : null}
        </View>
        {quick && canBook ? null : offerLine}
        {body}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {moving === null && !nutritionistApart ? <SoleNutritionist days={days} /> : null}
      <SectionTitle>
        {moving !== null ? "Elige el nuevo horario" : "Reserva tu evaluación"}
      </SectionTitle>
      {moving !== null ? (
        <>
          <MovingBand evaluation={moving} onBack={onStopMoving} />
          {failure}
        </>
      ) : null}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inCard: { gap: spacing.xs },
  link: { alignSelf: "flex-start", paddingHorizontal: 0 },
  more: { justifyContent: "center", minHeight: 32 },
  section: { gap: spacing.md },
});
