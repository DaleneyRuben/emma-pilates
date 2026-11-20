import {
  BodyText,
  Calendar,
  ConfirmationSheet,
  OutlinedButton,
  boliviaCivilDate,
  colors,
  spacing,
  fontFamilies,
} from "@pilates/mobile-core";
import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

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
        <BodyText>Lo dice tu banco al generar el QR.</BodyText>
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
        <BodyText>{`Vale hasta el ${qrDate(picked)}. Te avisaremos 7 días antes y cuando venza.`}</BodyText>
      )}
      {message === null ? null : (
        <Text accessibilityRole="alert" style={styles.failure}>
          {message}
        </Text>
      )}
    </ConfirmationSheet>
  );
}

const styles = StyleSheet.create({
  failure: { fontFamily: fontFamilies.body, color: colors.errorText, fontSize: 14 },
  lead: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  thumb: {
    backgroundColor: colors.white,
    borderColor: colors.borderSoft,
    borderRadius: spacing.md,
    borderWidth: 1,
    height: 64,
    width: 64,
  },
});
