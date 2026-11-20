import { PrimaryButton, StateScreen } from "@pilates/mobile-core";
import { useEffect, useEffectEvent } from "react";
import { BackHandler, ScrollView } from "react-native";

import { bodyScroll, FooterPanel, RowCard } from "../profile/card-pieces";
import { BackBar } from "../ui/back-bar";
import { ValueRow } from "../ui/value-row";

/**
 * S10 «¡Pago registrado!» and «Comprobante enviado» (E-P06, E-P07): the state
 * card, the sale's rows on their own card, and «Volver a Clientas» in the
 * white footer. The band's back arrow takes the same way out.
 */
export function PaymentDone({
  amount,
  classes,
  endsOn,
  firstName,
  kind,
  onBack,
  scheduled,
  startsOn,
}: {
  amount: string;
  classes: string;
  endsOn?: string;
  firstName: string;
  kind: "cash" | "transfer";
  onBack: () => void;
  /** A renewal starts later instead of at once. */
  scheduled: boolean;
  /** The scheduled Plan's first day, «20 de octubre». */
  startsOn?: string;
}) {
  const cash = kind === "cash";
  // The only way on is «Volver a Clientas»: the Android back button takes it
  // too instead of reopening the spent plan list (MOB-074).
  const back = useEffectEvent(onBack);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => subscription.remove();
  }, []);
  const note = cash
    ? scheduled
      ? `El plan de ${firstName} queda programado y el efectivo entró en la caja de hoy.`
      : `El plan de ${firstName} ya está activo y el efectivo entró en la caja de hoy.`
    : scheduled && startsOn !== undefined
      ? `Administración lo revisa y programa el plan siguiente de ${firstName}, que empieza el ${startsOn}. No entra en la caja de hoy.`
      : `Administración lo revisa y activa el plan de ${firstName}. No entra en la caja de hoy.`;
  return (
    <>
      <BackBar onBack={onBack} />
      <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
        <StateScreen
          icon="check"
          layout="card"
          note={note}
          title={cash ? "¡Pago registrado!" : "Comprobante enviado"}
        />
        <RowCard>
          <ValueRow label="Plan" value={classes} />
          {scheduled && startsOn !== undefined ? (
            <ValueRow label="Empieza" value={startsOn} />
          ) : null}
          <ValueRow label={cash ? "Cobrado en efectivo" : "Transferencia por QR"} value={amount} />
          {cash ? (
            endsOn === undefined ? null : (
              <ValueRow label="Vence" value={endsOn} />
            )
          ) : (
            <ValueRow label="Estado" value="En revisión" />
          )}
        </RowCard>
      </ScrollView>
      <FooterPanel>
        <PrimaryButton label="Volver a Clientas" onPress={onBack} testID="cash-back-to-client" />
      </FooterPanel>
    </>
  );
}
