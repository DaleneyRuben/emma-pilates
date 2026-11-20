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
  surfaces,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

  const otherOne = booked && moving === null;
  const note = (
    <BodyText style={styles.muted}>
      {moving === null
        ? "Puedes reservar hasta 3 horas antes."
        : "Puedes reprogramarla hasta 3 horas antes."}
    </BodyText>
  );
  const body =
    availability === null ? (
      <QueryFailure label="No pudimos cargar los horarios de evaluación." onRetry={onRetry} />
    ) : moving === null && !hasPlan ? (
      <View style={otherOne ? styles.inCard : styles.card}>
        <BodyText style={styles.body}>Necesitas un plan activo para reservar.</BodyText>
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
          <Text accessibilityRole="header" style={styles.title}>
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
              <Text style={styles.moreLabel}>Ver más días</Text>
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
      {moving === null ? <SoleNutritionist days={days} /> : null}
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
  body: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  card: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inCard: { gap: spacing.xs },
  link: { alignSelf: "flex-start", paddingHorizontal: 0 },
  more: { justifyContent: "center", minHeight: 32 },
  moreLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  muted: { color: colors.text, fontSize: typography.note, fontFamily: fontFamilies.body },
  section: { gap: spacing.md },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 11 * 0.14,
    textTransform: "uppercase",
  },
});
