import {
  attachEvaluationReceipt,
  bookEvaluation,
  bookPaidEvaluation,
  getListEvaluationSlotsQueryKey,
  getListEvaluationsQueryKey,
  type ClientEvaluationDto,
  type EvaluationSlotDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  EmphasisCard,
  fontFamilies,
  formatBolivianos,
  Heading,
  IconRow,
  IconRowGroup,
  PrimaryButton,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  usePushNotifications,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { ReceiptRow } from "../payments/receipt-row";
import { pickReceipt, type AttachedReceipt } from "../payments/receipt-upload";
import { idempotency, uploadImage } from "../uploads/image-upload";
import { clockTime, evaluationDate } from "./evaluation-format";

type BookNavigation = {
  goBack: () => void;
  navigate: (screen: "MyEvaluations", params: { confirmed: ClientEvaluationDto }) => void;
};

const bookingProblems: Record<string, string> = {
  evaluation_month_used: "Ya tienes una evaluación reservada para ese mes.",
  evaluation_slot_unavailable: "Ese horario ya no está disponible. Elige otro.",
  evaluation_booking_closed: "Ese horario ya cerró: se puede reservar hasta 3 horas antes.",
  evaluation_slot_not_found: "Ese horario ya no está disponible. Elige otro.",
  evaluation_payment_pending: "Ya tienes un pago de evaluación pendiente.",
  no_eligible_subscription: "Necesitas un plan activo para reservar tu evaluación.",
};

const problemMessage = (body: unknown): string => {
  const code =
    typeof body === "object" && body !== null ? (body as { code?: unknown }).code : undefined;
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
  const { offerPermission: offerPushPermission } = usePushNotifications();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receipt, setReceipt] = useState<AttachedReceipt | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // One key per confirmation screen, so a retried tap replays the same booking.
  const idempotencyKey = useRef(randomUUID());

  const attach = async () => {
    setMessage(null);
    try {
      const picked = await pickReceipt();
      if (picked === null) return;
      setUploading(true);
      const imageAssetId = await uploadImage(picked, "transfer_receipt", fetcher);
      setReceipt({ imageAssetId, localUri: picked.uri });
    } catch {
      setMessage("No pudimos subir el comprobante. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const confirm = async () => {
    if (!slot.included && receipt === null) return;
    setSubmitting(true);
    setMessage(null);
    let booked = false;
    try {
      const book = slot.included ? bookEvaluation : bookPaidEvaluation;
      const response = await book(
        slot.id,
        { headers: { "idempotency-key": idempotencyKey.current } },
        fetcher,
      );
      if (response.status === 201) {
        booked = true;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListEvaluationSlotsQueryKey() }),
          queryClient.invalidateQueries({
            queryKey: getListEvaluationsQueryKey({ scope: "upcoming" }),
          }),
        ]);
      }
      if (response.status === 201 && !slot.included && receipt !== null) {
        const attached = await attachEvaluationReceipt(
          response.data.id,
          { imageAssetId: receipt.imageAssetId },
          idempotency(),
          fetcher,
        );
        if (attached.status !== 204) {
          setMessage("Reservamos la evaluación, pero no pudimos adjuntar el comprobante.");
          return;
        }
      }
      if (response.status === 201) {
        offerPushPermission();
        navigation.navigate("MyEvaluations", { confirmed: response.data });
        return;
      }
      setMessage(problemMessage(response.data));
    } catch {
      setMessage(
        booked
          ? "Reservamos la evaluación, pero no pudimos adjuntar el comprobante."
          : "No pudimos reservar la evaluación. Inténtalo de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar
        fullBleed
        onBack={() => navigation.goBack()}
        title="Evaluación nutricional"
        tone="context"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading accessibilityRole="header">Confirma tu cita</Heading>
        <EmphasisCard
          eyebrow={capitalized(evaluationDate(slot.startsAt))}
          note={`${slot.durationMinutes} minutos · ${slot.nutritionistName} · ${slot.branchName}`}
          testID="evaluation-hero"
        >
          <Text style={styles.time}>{clockTime(slot.startsAt)}</Text>
        </EmphasisCard>
        <IconRowGroup>
          <IconRow
            icon={slot.included ? "check" : "card"}
            label={
              slot.included
                ? "Es gratis: no usa clases de tu plan"
                : `Cuesta ${formatBolivianos(slot.priceCentavos)}: transfiere y sube tu comprobante`
            }
          />
          <IconRow icon="bell" label="Te avisamos un día y una hora antes" />
          <IconRow icon="undo" label="Cancela hasta 3 horas antes" />
        </IconRowGroup>
        {slot.included ? null : (
          <View style={styles.group}>
            <ReceiptRow
              onAttach={() => void attach()}
              onRemove={() => setReceipt(null)}
              receipt={receipt}
              testID="evaluation-receipt"
              uploading={uploading}
            />
          </View>
        )}
        {message !== null ? (
          <BodyText accessibilityRole="alert" style={styles.failure}>
            {message}
          </BodyText>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          busy={submitting}
          disabled={!slot.included && (receipt === null || uploading)}
          label="Confirmar evaluación"
          onPress={() => void confirm()}
        />
      </View>
    </Screen>
  );
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.lg },
  failure: { color: colors.errorText },
  footer: { paddingBottom: spacing.sm, paddingTop: spacing.sm },
  group: { ...surfaces.card },
  screen: { gap: spacing.lg },
  time: {
    color: colors.white,
    fontFamily: fontFamilies.display,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
  },
});
