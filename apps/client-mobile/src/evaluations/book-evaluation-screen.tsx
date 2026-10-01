import {
  bookEvaluation,
  getListEvaluationSlotsQueryKey,
  getListEvaluationsQueryKey,
  type ClientEvaluationDto,
  type EvaluationSlotDto,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  Heading,
  initials,
  PrimaryButton,
  radii,
  Screen,
  shadows,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { clockTime, evaluationDate } from "./evaluation-format";

type BookNavigation = {
  goBack: () => void;
  navigate: (
    screen: "MyEvaluations",
    params: { confirmed: ClientEvaluationDto },
  ) => void;
};

const bookingProblems: Record<string, string> = {
  evaluation_month_used: "Ya tienes una evaluación reservada para ese mes.",
  evaluation_slot_unavailable: "Ese horario ya no está disponible. Elige otro.",
  evaluation_booking_closed:
    "Ese horario ya cerró: se puede reservar hasta 3 horas antes.",
  evaluation_slot_not_found: "Ese horario ya no está disponible. Elige otro.",
  no_eligible_subscription: "Necesitas un plan activo para reservar tu evaluación.",
};

const problemMessage = (body: unknown): string => {
  const code =
    typeof body === "object" && body !== null
      ? (body as { code?: unknown }).code
      : undefined;
  return (
    (typeof code === "string" ? bookingProblems[code] : undefined) ??
    "No pudimos reservar la evaluación. Inténtalo de nuevo."
  );
};

export function BookEvaluationScreen({
  route,
}: {
  route: { params: { slot: EvaluationSlotDto } };
}) {
  const { slot } = route.params;
  const navigation = useNavigation<BookNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // One key per confirmation screen, so a retried tap replays the same booking.
  const idempotencyKey = useRef(randomUUID());

  const confirm = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await bookEvaluation(
        slot.id,
        { headers: { "idempotency-key": idempotencyKey.current } },
        fetcher,
      );
      if (response.status === 201) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListEvaluationSlotsQueryKey() }),
          queryClient.invalidateQueries({
            queryKey: getListEvaluationsQueryKey({ scope: "upcoming" }),
          }),
        ]);
        navigation.navigate("MyEvaluations", { confirmed: response.data });
        return;
      }
      setMessage(problemMessage(response.data));
    } catch {
      setMessage("No pudimos reservar la evaluación. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Confirmar evaluación">Confirmar evaluación</Heading>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <BodyText>{evaluationDate(slot.startsAt)}</BodyText>
          <Text style={styles.time}>{clockTime(slot.startsAt)}</Text>
          <BodyText style={styles.muted}>
            {`${slot.durationMinutes} minutos · Sucursal ${slot.branchName}`}
          </BodyText>
          <View style={styles.nutritionist}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(slot.nutritionistName)}</Text>
            </View>
            <View>
              <Text style={styles.name}>{slot.nutritionistName}</Text>
              <BodyText style={styles.muted}>Nutricionista</BodyText>
            </View>
          </View>
        </View>
        <View style={styles.free}>
          <Text style={styles.freeText}>Es gratuita — no usa clases de tu plan.</Text>
        </View>
        <View style={styles.note}>
          <BodyText>Te avisaremos un día antes y una hora antes de tu cita.</BodyText>
        </View>
        <BodyText style={styles.muted}>
          Si necesitas cambiarla, puedes cancelarla desde Mis evaluaciones hasta 3 horas antes.
        </BodyText>
        {message !== null ? (
          <BodyText accessibilityRole="alert" style={styles.failure}>
            {message}
          </BodyText>
        ) : null}
      </ScrollView>
      <PrimaryButton
        disabled={submitting}
        label="Confirmar"
        onPress={() => void confirm()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: { color: colors.primaryOnTint, fontSize: typography.note, fontWeight: "600" },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  failure: { color: colors.errorText },
  free: {
    backgroundColor: "rgba(124,148,115,0.14)",
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  freeText: { color: colors.successText, fontSize: typography.body, fontWeight: "500" },
  muted: { color: colors.textMuted, fontSize: typography.note },
  name: { color: colors.text, fontSize: typography.body, fontWeight: "500" },
  note: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  nutritionist: {
    alignItems: "center",
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  screen: { gap: spacing.lg },
  summary: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.xl,
    ...shadows.card,
  },
  time: { color: colors.text, fontSize: typography.display, fontWeight: "400" },
});
