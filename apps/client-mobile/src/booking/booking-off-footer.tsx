import { BodyText, colors, PrimaryButton, TextButton, typography } from "@pilates/mobile-core";
import { StyleSheet } from "react-native";

import type { PaymentStanding } from "../payments/payment-standing";

/** Why Reservar is off on the class detail (follow-up 246, C04c–C04f). */
export type BookingOffReason = "no_plan" | "no_classes" | "in_review" | "rejected";

/** A payment in review or rejected wins over the two Plan cases. */
export function bookingOffReason(standing: PaymentStanding, hasPlan: boolean): BookingOffReason {
  if (standing.kind !== "none") return standing.kind;
  return hasPlan ? "no_classes" : "no_plan";
}

const copy: Record<BookingOffReason, { note: string; action: string }> = {
  no_plan: { note: "Necesitas un plan para reservar.", action: "Comprar un plan" },
  no_classes: { note: "No te quedan clases en tu plan.", action: "Comprar un plan" },
  in_review: {
    note: "Tu pago está en revisión. Podrás reservar cuando el estudio lo confirme.",
    action: "Ver estado del pago",
  },
  rejected: { note: "No pudimos confirmar tu pago.", action: "Subir otro comprobante" },
};

export function BookingOffFooter({
  busy,
  error,
  onAction,
  reason,
}: {
  busy: boolean;
  error: string | null;
  onAction: () => void;
  reason: BookingOffReason;
}) {
  return (
    <>
      <BodyText style={styles.note}>{copy[reason].note}</BodyText>
      <PrimaryButton disabled label="Reservar" />
      <TextButton
        label={busy ? "Preparando…" : copy[reason].action}
        onPress={() => {
          if (!busy) onAction();
        }}
      />
      {error === null ? null : (
        <BodyText accessibilityRole="alert" style={styles.error}>
          {error}
        </BodyText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.errorText, textAlign: "center" },
  note: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
});
