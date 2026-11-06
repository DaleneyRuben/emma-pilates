import type { ClientInvoiceDto } from "@pilates/api-contracts";
import { colors, fontFamilies } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

const dateFormat = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/La_Paz",
});

/** «5 nov 2026», the day she paid, in Bolivia. */
export const invoiceDate = (instant: string): string => dateFormat.format(new Date(instant));

export const invoiceStateLabel = (invoice: ClientInvoiceDto): string =>
  invoice.voided ? "Pago anulado" : invoice.state === "ready" ? "Lista" : "En preparación";

const tones = {
  ready: { background: "rgba(124,148,115,0.16)", text: colors.successText },
  preparing: { background: "rgba(216,201,187,0.34)", text: colors.textMuted },
  voided: { background: colors.primaryTint, text: colors.primaryOnTint },
};

// K2's state pill: «Lista» (Éxito), «En preparación» (neutral), «Pago anulado».
export function InvoicePill({ invoice }: { invoice: ClientInvoiceDto }) {
  const tone = tones[invoice.voided ? "voided" : invoice.state];
  return (
    <View style={[styles.pill, { backgroundColor: tone.background }]}>
      <Text style={[styles.label, { color: tone.text }]}>{invoiceStateLabel(invoice)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fontFamilies.bodyStrong, fontSize: 12 },
  pill: { borderRadius: 999, height: 24, justifyContent: "center", paddingHorizontal: 9 },
});
