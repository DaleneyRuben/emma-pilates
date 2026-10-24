import type { AdminPaymentDto } from "@pilates/api-contracts";
import {
  boliviaParts,
  boliviaToday,
  formatCivilDate,
} from "../lib/bolivia-time";
import { csvDocument } from "../lib/csv";

export const methodLabels: Record<AdminPaymentDto["method"], string> = {
  transfer: "Transferencia",
  cash: "Efectivo",
};

const stateLabels: Record<AdminPaymentDto["state"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  rejected: "Rechazado",
};

const civilDay = (instant: string): string =>
  formatCivilDate(boliviaParts(instant).date);

// A plain decimal a spreadsheet sums as a number.
const amount = (centavos: number): string => (centavos / 100).toFixed(2);

/** PAY-007, follow-up 147 §4: the accountant's CSV of AW28's filtered rows. */
export const paymentsCsv = (rows: readonly AdminPaymentDto[]): string =>
  csvDocument([
    [
      "Fecha",
      "Cliente",
      "Plan",
      "Método",
      "Monto (Bs)",
      "Estado",
      "NIT o CI",
      "Nombre o razón social",
      "Factura emitida",
      "Emitida por",
      "Emitida el",
    ],
    ...rows.map((row) => [
      civilDay(row.submittedAt),
      row.clientName,
      row.planName,
      methodLabels[row.method],
      amount(row.amountDueCentavos),
      stateLabels[row.state],
      row.invoiceData?.taxId ?? "",
      row.invoiceData?.name ?? "",
      row.invoiceIssued === null ? "No" : "Sí",
      row.invoiceIssued?.issuedByName ?? "",
      row.invoiceIssued === null ? "" : civilDay(row.invoiceIssued.issuedAt),
    ]),
  ]);

export const paymentsCsvName = (now: Date): string =>
  `pagos-${boliviaToday(now)}.csv`;
