import type { ClientInvoiceDto } from "@pilates/api-contracts";
import { colors, ExceptionPill, fontFamilies, typography } from "@pilates/mobile-core";
import { StyleSheet, Text } from "react-native";

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

/**
 * K2's state in palette B (FIX-089): «Lista» and «En preparación» are words,
 * the one still being prepared in weight; a voided sale is the exception, on
 * the Rubor pill.
 */
export function InvoiceState({ invoice }: { invoice: ClientInvoiceDto }) {
  if (invoice.voided) return <ExceptionPill>{invoiceStateLabel(invoice)}</ExceptionPill>;
  return (
    <Text style={[styles.label, invoice.state !== "ready" && styles.pending]}>
      {invoiceStateLabel(invoice)}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  pending: { fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
});
