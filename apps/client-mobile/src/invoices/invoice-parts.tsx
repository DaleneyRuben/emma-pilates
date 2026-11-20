import { formatListDate, type ClientInvoiceDto } from "@pilates/api-contracts";
import { ExceptionPill, Text } from "@pilates/mobile-core";

/** «jue 5 nov», the day she paid, in Bolivia (FIX-090's list date). */
export const invoiceDate = (instant: string): string => formatListDate(instant);

export const invoiceStateLabel = (invoice: ClientInvoiceDto): string =>
  invoice.voided ? "Pago anulado" : invoice.state === "ready" ? "Lista" : "En preparación";

/**
 * K2's state in palette B (FIX-089): «Lista» and «En preparación» are words in
 * `pastilla` (C17), the same weight in both states; a voided sale is the
 * exception, on the Rubor pill.
 */
export function InvoiceState({ invoice }: { invoice: ClientInvoiceDto }) {
  if (invoice.voided) return <ExceptionPill>{invoiceStateLabel(invoice)}</ExceptionPill>;
  return <Text variant="pastilla">{invoiceStateLabel(invoice)}</Text>;
}
