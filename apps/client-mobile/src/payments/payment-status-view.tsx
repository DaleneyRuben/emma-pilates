import {
  colors,
  fontFamilies,
  StateScreen,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

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
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

/**
 * 11's three states on v2 (follow-up 225 §6, walkthrough n.º 15): centred,
 * the line icon in its disc, the owner's copy, the Plan's facts, and buttons.
 */
export function PaymentStatusView({
  busy = false,
  endsOn,
  onHome,
  onPrimary,
  payment,
  state,
}: {
  busy?: boolean;
  /** The active Plan's end, once confirmed. */
  endsOn?: string;
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
      <StateScreen
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
      </StateScreen>
    );
  }

  if (state === "rejected") {
    const reason = payment.rejectionReason?.trim();
    return (
      <StateScreen
        icon="alert"
        note={`${reason === undefined || reason === "" ? "" : `${reason} `}Sube uno nuevo para activar tu plan.`}
        primaryAction={
          onPrimary === undefined
            ? undefined
            : { label: busy ? "Preparando…" : "Subir otro comprobante", onPress: onPrimary }
        }
        textAction={home}
        title="No pudimos confirmar tu pago"
        tone="error"
      >
        <Facts
          rows={[
            ["Plan", payment.planName],
            ["Monto esperado", amount],
          ]}
        />
      </StateScreen>
    );
  }

  return (
    <StateScreen
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
    </StateScreen>
  );
}

const styles = StyleSheet.create({
  facts: { ...surfaces.card, alignSelf: "stretch", marginTop: spacing.sm },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: spacing.lg },
  label: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.body },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  value: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: typography.body },
});
