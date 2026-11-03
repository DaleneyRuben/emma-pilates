import { IconRowGroup, StateScreen } from "@pilates/mobile-core";
import { useEffect, useEffectEvent } from "react";
import { BackHandler, StyleSheet, View } from "react-native";

import { StatusPill } from "../ui/session-row";
import { ValueRow } from "../ui/value-row";

/** S10 «¡Pago registrado!» and «Comprobante enviado»: centred states (follow-up 225 §6). */
export function PaymentDone({
  amount,
  classes,
  endsOn,
  firstName,
  kind,
  onBack,
  scheduled,
}: {
  amount: string;
  classes: string;
  endsOn?: string;
  firstName: string;
  kind: "cash" | "transfer";
  onBack: () => void;
  /** A renewal starts later instead of at once. */
  scheduled: boolean;
}) {
  const cash = kind === "cash";
  // The only way on is «Volver a Clientes»: the Android back button takes it
  // too instead of reopening the spent plan list (MOB-074).
  const back = useEffectEvent(onBack);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => subscription.remove();
  }, []);
  return (
    <StateScreen
      icon="check"
      note={
        cash
          ? scheduled
            ? `El plan de ${firstName} queda programado y el efectivo entró en la caja de hoy.`
            : `El plan de ${firstName} ya está activo y el efectivo entró en la caja de hoy.`
          : `Administración lo revisa y activa el plan de ${firstName}. No entra en la caja de hoy.`
      }
      primaryAction={{ label: "Volver a Clientes", onPress: onBack, testID: "cash-back-to-client" }}
      title={cash ? "¡Pago registrado!" : "Comprobante enviado"}
    >
      <View style={styles.summary}>
        <IconRowGroup>
          <ValueRow label="Plan" value={classes} />
          <ValueRow label={cash ? "Cobrado en efectivo" : "Transferencia por QR"} value={amount} />
          {cash ? (
            endsOn === undefined ? null : (
              <ValueRow label="Vence" value={endsOn} />
            )
          ) : (
            <ValueRow label="Estado" value={<StatusPill label="En revisión" />} />
          )}
        </IconRowGroup>
      </View>
    </StateScreen>
  );
}

const styles = StyleSheet.create({ summary: { alignSelf: "stretch", marginTop: 8 } });
