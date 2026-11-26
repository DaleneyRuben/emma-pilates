import {
  colors,
  PrimaryButton,
  spacing,
  StatusLayout,
  surfaces,
  Text,
  TextButton,
  type GlyphName,
} from "@pilates/mobile-core";
import { Fragment, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { formatCivilDate } from "../home/home-format";
import { formatBolivianos } from "../plans/plan-format";

export type PaymentStatusState = "pending" | "confirmed" | "rejected";

type StatusPayment = {
  amountDueCentavos: number;
  classAllowance: number;
  planName: string;
  rejectionReason?: string | null;
};

function Facts({ rows }: { rows: readonly [string, string][] }) {
  return (
    <View style={styles.facts} testID="payment-status-facts">
      {rows.map(([label, value], index) => (
        <Fragment key={label}>
          {index === 0 ? null : <View style={styles.hairline} />}
          <View style={styles.row}>
            <Text style={styles.label} variant="cuerpo">
              {label}
            </Text>
            <Text style={styles.value} variant="titulo-fila">
              {value}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

/** The staff reason as its own sentence: a full stop when she left none (FIX-090). */
function sentence(text: string | null | undefined): string {
  const trimmed = text?.trim() ?? "";
  if (trimmed === "" || /[.!?…]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

type Action = { label: string; onPress: () => void; testID?: string };

/**
 * 11's three states (walkthrough n.º 15, Rosa Emma C11, C11b, C11c): the band
 * holds the line icon on a white disc and the `titulo-pagina` title; the owner's copy and
 * the Plan's facts are white cards; the buttons sit on the white footer.
 */
function PaymentLayout({
  primaryAction,
  textAction,
  ...layout
}: {
  children: ReactNode;
  error?: string | null;
  icon: GlyphName;
  note: string;
  primaryAction?: Action;
  textAction?: Action;
  title: string;
}) {
  return (
    <StatusLayout
      {...layout}
      actions={
        <>
          {primaryAction === undefined ? null : <PrimaryButton {...primaryAction} />}
          {textAction === undefined ? null : <TextButton {...textAction} />}
        </>
      }
      testID="payment-status"
    />
  );
}

export function PaymentStatusView({
  busy = false,
  endsOn,
  error,
  onHome,
  onPrimary,
  payment,
  state,
}: {
  busy?: boolean;
  /** The active Plan's end, once confirmed. */
  endsOn?: string;
  /** Why sending another receipt could not start. */
  error?: string | null;
  onHome: () => void;
  /** «Reservar una clase» once confirmed; «Subir otro comprobante» once rejected. */
  onPrimary?: () => void;
  payment: StatusPayment;
  state: PaymentStatusState;
}) {
  const amount = formatBolivianos(payment.amountDueCentavos);
  const home = { label: "Volver al inicio", onPress: onHome, testID: "payment-status-home" };

  if (state === "confirmed") {
    return (
      <PaymentLayout
        error={error}
        icon="check"
        note="Tu plan ya está activo. Nos vemos pronto en el estudio."
        primaryAction={
          onPrimary === undefined ? undefined : { label: "Reservar una clase", onPress: onPrimary }
        }
        textAction={{ ...home, label: "Ir al inicio" }}
        title="¡Pago confirmado!"
      >
        <Facts
          rows={
            endsOn === undefined
              ? [["Plan", payment.planName]]
              : [
                  ["Plan", payment.planName],
                  ["Vence", formatCivilDate(endsOn)],
                ]
          }
        />
      </PaymentLayout>
    );
  }

  if (state === "rejected") {
    const reason = sentence(payment.rejectionReason);
    return (
      <PaymentLayout
        error={error}
        icon="alert"
        note={`${reason === "" ? "" : `${reason} `}Sube uno nuevo para activar tu plan.`}
        primaryAction={
          onPrimary === undefined
            ? undefined
            : { label: busy ? "Preparando…" : "Subir otro comprobante", onPress: onPrimary }
        }
        textAction={home}
        title="No pudimos confirmar tu pago"
      >
        <Facts
          rows={[
            ["Plan", payment.planName],
            ["Monto esperado", amount],
          ]}
        />
      </PaymentLayout>
    );
  }

  return (
    <PaymentLayout
      error={error}
      icon="hourglass"
      note="Nuestro equipo está revisando tu comprobante. Suele tomar unos minutos en horario de atención. Te avisaremos apenas esté listo."
      primaryAction={home}
      title="Tu pago está en revisión"
    >
      <Facts
        rows={[
          ["Plan", payment.planName],
          ["Monto", amount],
        ]}
      />
    </PaymentLayout>
  );
}

const styles = StyleSheet.create({
  facts: { ...surfaces.card, overflow: "hidden" },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  label: { flex: 1 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  value: { flexShrink: 1, textAlign: "right" },
});
