import { formatListDate, type ClientInvoiceDto } from "@pilates/api-contracts";
import { colors, ExceptionPill, fontFamilies } from "@pilates/mobile-core";
import { StyleSheet, Text } from "react-native";

/** «jue 5 nov», the day she paid, in Bolivia (FIX-090's list date). */
export const invoiceDate = (instant: string): string => formatListDate(instant);

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
  // C17: both states in words at 14 semibold.
  label: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    fontWeight: "600",
  },
  pending: { fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
});
