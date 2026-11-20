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
  IconRow,
  IconRowGroup,
  PrimaryButton,
  Screen,
  ScreenTopBar,
  shadows,
  SectionTitle,
  spacing,
  surfaces,
  typography,
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
import { TransferQrCard } from "../payments/transfer-qr-card";
import { idempotency, uploadImage } from "../uploads/image-upload";
import { clockTime, evaluationDate } from "./evaluation-format";

type BookNavigation = {
  goBack: () => void;
  // Back to the one «Evaluación nutricional» (follow-up 264): the new
  // Evaluation shows on top with the toast.
  popTo: (screen: "EvaluationAvailability", params: { confirmed: ClientEvaluationDto }) => void;
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
        navigation.popTo("EvaluationAvailability", { confirmed: response.data });
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
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Confirma tu cita" />
      <ScrollView contentContainerStyle={styles.content}>
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
                : `Cuesta ${formatBolivianos(slot.priceCentavos)} · se paga por transferencia`
            }
          />
          <IconRow icon="bell" label="Te avisamos un día y una hora antes" />
          <IconRow icon="undo" label="Cancela hasta 3 horas antes" />
        </IconRowGroup>
        {slot.included ? null : (
          // C14b: C10's two steps, the studio QR then the receipt (follow-up 262).
          <>
            <View>
              <SectionTitle>1 · Paga con el QR del estudio</SectionTitle>
              <TransferQrCard amount={formatBolivianos(slot.priceCentavos)} fetcher={fetcher} />
            </View>
            <View>
              <SectionTitle>2 · Sube tu comprobante</SectionTitle>
              <View style={styles.group}>
                <ReceiptRow
                  onAttach={() => void attach()}
                  onRemove={() => setReceipt(null)}
                  receipt={receipt}
                  testID="evaluation-receipt"
                  uploading={uploading}
                />
              </View>
            </View>
          </>
        )}
        {message !== null ? (
          <View style={styles.failureBox}>
            <BodyText accessibilityRole="alert" style={styles.failure}>
              {message}
            </BodyText>
          </View>
        ) : null}
      </ScrollView>
      {/* C14: the button and its line sit on the white footer. */}
      <View style={styles.footer} testID="evaluation-footer">
        {slot.included || receipt === null ? null : (
          <BodyText style={styles.note}>El estudio revisa tu pago y te avisa por la app</BodyText>
        )}
        <PrimaryButton
          busy={submitting}
          disabled={!slot.included && (receipt === null || uploading)}
          // FIX-089: the reason is the off button's own line, under it.
          disabledReason={
            !slot.included && receipt === null ? "Adjunta tu comprobante para continuar" : undefined
          }
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
  content: { gap: spacing.md, paddingBottom: spacing.lg, paddingTop: spacing.xxs },
  failure: { color: colors.errorText, fontSize: 14, lineHeight: 20 },
  failureBox: {
    ...surfaces.soft,
    borderColor: colors.borderStrong,
    borderWidth: 1.5,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  // A white panel from edge to edge with the card shadow cast upward.
  footer: {
    ...shadows.footer,
    backgroundColor: colors.card,
    gap: spacing.sm,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.xlSm,
    paddingVertical: spacing.mdLg,
  },
  group: { ...surfaces.card },
  note: {
    color: colors.text,
    fontSize: typography.note,
    textAlign: "center",
    fontFamily: fontFamilies.body,
  },
  screen: { gap: spacing.md, paddingBottom: 0 },
  time: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
  },
});
