import { formatMoney, type PaymentDto } from "@pilates/api-contracts";
import { BodyText, colors, spacing } from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

import { HomeNotice } from "./home-notice";

/** The booking row's note while Inicio shows a payment instead of a Plan. */
export const bookingLockNote = {
  in_review: "Tu pago está en revisión",
  rejected: "Tu pago no se confirmó",
} as const;

/** C8 A: the receipt is sent and the studio has not decided yet. */
export function PaymentInReviewCard({
  hasActivePlan,
  onOpen,
  payment,
}: {
  /** A renewal: she keeps booking with the current Plan meanwhile. */
  hasActivePlan: boolean;
  onOpen: () => void;
  payment: PaymentDto;
}) {
  const meanwhile = hasActivePlan ? " Mientras, sigues usando tu plan actual." : "";
  return (
    <HomeNotice
      corner={formatMoney(payment.amountDueCentavos)}
      eyebrow="Tu pago está en revisión"
      lines={[`Te avisamos apenas el estudio lo confirme.${meanwhile}`]}
      link={{ label: "Ver estado del pago", onPress: onOpen, testID: "home-payment-status" }}
      onPress={onOpen}
      testID="home-payment-card"
      title={payment.planName}
    />
  );
}

/** C8 C: the receipt was rejected; she sends another for the same Plan. */
export function PaymentRejectedCard({
  busy,
  error,
  onResend,
  payment,
}: {
  busy: boolean;
  error: string | null;
  onResend: () => void;
  payment: PaymentDto;
}) {
  return (
    <View style={styles.stack}>
      <HomeNotice
        action={{
          busy,
          label: "Subir otro comprobante",
          onPress: onResend,
          testID: "home-payment-resend",
        }}
        corner={formatMoney(payment.amountDueCentavos)}
        eyebrow="No pudimos confirmar tu pago"
        lines={[
          ...(payment.rejectionReason ? [payment.rejectionReason] : []),
          "Sube uno nuevo para activar tu plan.",
        ]}
        testID="home-payment-card"
        title={payment.planName}
      />
      {error === null ? null : (
        <BodyText accessibilityRole="alert" style={styles.error}>
          {error}
        </BodyText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.errorText },
  stack: { gap: spacing.sm },
});
