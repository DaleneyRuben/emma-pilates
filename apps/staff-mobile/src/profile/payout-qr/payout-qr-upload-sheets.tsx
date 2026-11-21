import {
  Calendar,
  ConfirmationSheet,
  InlineError,
  OutlinedButton,
  boliviaCivilDate,
  colors,
  spacing,
  Text,
} from "@pilates/mobile-core";
import { useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { qrDate, validUntilSpan } from "./payout-qr-dates";

/** «Sube tu QR de cobro»: where the photo comes from (follow-up 276). */
export function PayoutQrSourceSheet({
  onCancel,
  onPick,
  visible,
}: {
  onCancel: () => void;
  onPick: (camera: boolean) => void;
  visible: boolean;
}) {
  return (
    <ConfirmationSheet
      confirmLabel="Elegir de la galería"
      dismissLabel="Cancelar"
      note="Una foto o captura del QR que te da tu banco para recibir pagos."
      onConfirm={() => onPick(false)}
      onDismiss={onCancel}
      title="Sube tu QR de cobro"
      tone="primary"
      visible={visible}
    >
      <OutlinedButton label="Tomar foto" onPress={() => onPick(true)} />
    </ConfirmationSheet>
  );
}

/**
 * «¿Hasta cuándo vale?»: the picked photo's last valid day, from tomorrow on.
 * Saving uploads the photo and keeps both (follow-up 276).
 */
export function PayoutQrDateSheet({
  busy,
  failure,
  onCancel,
  onSave,
  photoUri,
  visible,
}: {
  busy: boolean;
  failure: string | null;
  onCancel: () => void;
  onSave: (validUntil: string) => void;
  photoUri: string | null;
  visible: boolean;
}) {
  const today = boliviaCivilDate(new Date());
  const span = useMemo(() => validUntilSpan(today), [today]);
  const [picked, setPicked] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const message = missing ? "Elige el último día que vale tu QR." : failure;

  return (
    <ConfirmationSheet
      busy={busy}
      confirmLabel="Guardar QR"
      confirmTestID="payout-qr-save"
      dismissLabel="Cancelar"
      onConfirm={() => {
        if (picked === null) setMissing(true);
        else onSave(picked);
      }}
      onDismiss={onCancel}
      title="¿Hasta cuándo vale?"
      tone="primary"
      visible={visible}
    >
      <View style={styles.lead}>
        {photoUri === null ? null : (
          <Image accessibilityIgnoresInvertColors source={{ uri: photoUri }} style={styles.thumb} />
        )}
        <Text style={styles.leadText} variant="cuerpo">
          Lo dice tu banco al generar el QR.
        </Text>
      </View>
      <Calendar
        firstMonth={span.firstMonth}
        isOff={span.isOff}
        lastMonth={span.lastMonth}
        onPressDay={(day) => {
          if (span.isOff(day)) return;
          setPicked(day);
          setMissing(false);
        }}
        rangeEnd={null}
        rangeStart={picked}
        today={today}
      />
      {picked === null ? null : (
        <Text variant="cuerpo">{`Vale hasta el ${qrDate(picked)}. Te avisaremos 7 días antes y cuando venza.`}</Text>
      )}
      {message === null ? null : <InlineError>{message}</InlineError>}
    </ConfirmationSheet>
  );
}

const styles = StyleSheet.create({
  lead: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  leadText: { flex: 1 },
  thumb: {
    backgroundColor: colors.white,
    borderColor: colors.borderSoft,
    borderRadius: spacing.md,
    borderWidth: 1,
    height: 64,
    width: 64,
  },
});
