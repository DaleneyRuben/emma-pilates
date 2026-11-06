import type { PaymentDto } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  EmphasisCard,
  fontFamilies,
  formatBolivianos,
  Glyph,
  spacing,
  surfaces,
} from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { promotionCardMaxWidth } from "./promotion-image";

const planLine = (payment: PaymentDto) =>
  `${payment.planName} · ${formatBolivianos(payment.amountDueCentavos)}`;

/** The booking row's note while Inicio shows a payment instead of a Plan. */
export const bookingLockNote = {
  in_review: "Tu pago está en revisión",
  rejected: "Tu pago no se confirmó",
} as const;

function Card({
  action,
  art,
  children,
  onPress,
  pill,
  title,
}: {
  action: { label: string; onPress: () => void; testID: string };
  art: "hourglass" | "receipt";
  children: ReactNode;
  onPress: () => void;
  pill: string;
  title: string;
}) {
  return (
    // The whole card opens the same place as its button; screen readers get the
    // button alone so the card's text is not read twice.
    <Pressable
      accessible={false}
      onPress={onPress}
      style={[styles.card, styles.capped]}
      testID="home-payment-card"
    >
      <View style={styles.body}>
        <EmphasisCard action={action} pill={pill} title={title}>
          {children}
        </EmphasisCard>
      </View>
      <Glyph
        color="rgba(255,255,255,0.45)"
        name={art}
        size={64}
        strokeWidth={0.6}
        style={styles.art}
      />
    </Pressable>
  );
}

/** C02c: the receipt is sent and the studio has not decided yet. */
export function PaymentInReviewCard({
  onOpen,
  payment,
}: {
  onOpen: () => void;
  payment: PaymentDto;
}) {
  return (
    <Card
      action={{ label: "Ver estado del pago", onPress: onOpen, testID: "home-payment-status" }}
      art="hourglass"
      onPress={onOpen}
      pill="En revisión"
      title="Tu pago está en revisión"
    >
      <Text style={styles.line}>{planLine(payment)}</Text>
      <Text style={styles.line}>Te avisamos apenas el estudio lo confirme.</Text>
    </Card>
  );
}

/** C02d: the receipt was rejected; she sends another for the same Plan. */
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
  const resend = () => {
    if (!busy) onResend();
  };
  return (
    <View style={styles.stack}>
      <Card
        action={{
          label: busy ? "Preparando…" : "Subir otro comprobante",
          onPress: resend,
          testID: "home-payment-resend",
        }}
        art="receipt"
        onPress={resend}
        pill="Pago rechazado"
        title="No pudimos confirmar tu pago"
      >
        {payment.rejectionReason ? (
          <Text numberOfLines={2} style={styles.line}>
            {payment.rejectionReason}
          </Text>
        ) : null}
        <Text style={styles.line}>{planLine(payment)}</Text>
      </Card>
      {error === null ? null : (
        <BodyText accessibilityRole="alert" style={styles.error}>
          {error}
        </BodyText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  art: { alignSelf: "flex-end", marginBottom: spacing.xlSm, marginRight: spacing.xlSm },
  body: { flex: 1 },
  capped: { alignSelf: "center", maxWidth: promotionCardMaxWidth, width: "100%" },
  card: { ...surfaces.emphasis, flexDirection: "row" },
  error: { color: colors.errorText },
  line: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 21,
  },
  stack: { gap: spacing.sm },
});
