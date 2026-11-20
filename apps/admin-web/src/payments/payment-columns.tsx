import { formatDateTime } from "@pilates/api-contracts";
import type { AdminPaymentDto } from "@pilates/api-contracts";
import { createColumnHelper } from "@tanstack/react-table";
import { RowOpener } from "../catalog/catalog-page";
import { ClientPhoto } from "../components/client-photo";
import { formatBolivianos } from "../lib/money";
import { InvoiceCell } from "./invoice-cell";
import { PaymentRowMenu } from "./payment-row-menu";
import { PaymentStatePill } from "./payment-state-pill";
import { methodLabels } from "./payments-csv";

const columns = createColumnHelper<AdminPaymentDto>();

// A transfer to review, or (FIX-044) a sale whose invoice is uploaded here.
export const canOpenPayment = (row: AdminPaymentDto) =>
  row.state === "pending" ||
  row.invoiceData !== null ||
  row.invoiceFile !== null;

/** «Plan · QR», «Evaluación · Efectivo»: the sale's kind and method. */
const saleLine = (row: AdminPaymentDto) =>
  `${row.kind === "evaluation" ? "Evaluación" : "Plan"} · ${methodLabels[row.method]}`;

// FIX-091 (W4 B): a clean table, the kind and method under the Plan, and the
// row's secondary actions (review, invoice, «Anular venta») behind «⋯».
export const paymentColumns = (open: (row: AdminPaymentDto) => void) => [
  columns.accessor("clientName", {
    header: "Clienta",
    cell: ({ row }) => (
      <span className="flex items-center gap-2.5">
        <ClientPhoto
          name={row.original.clientName}
          photo={row.original.clientPhoto}
        />
        {canOpenPayment(row.original) ? (
          <RowOpener
            label={row.original.clientName}
            onOpen={() => open(row.original)}
          />
        ) : (
          <span className="tipo-titulo-fila text-texto">
            {row.original.clientName}
          </span>
        )}
      </span>
    ),
  }),
  columns.accessor("planName", {
    header: "Plan",
    meta: { card: "detail", cardOrder: 1 },
    cell: ({ row }) => (
      <span className="flex flex-col gap-0.5">
        <span className="text-texto">{row.original.planName}</span>
        <span className="tipo-secundario text-texto">
          {saleLine(row.original)}
        </span>
      </span>
    ),
  }),
  // The amount paid (ADR-0082); Credit is retired (PAY-005).
  columns.accessor("amountDueCentavos", {
    header: "Monto",
    meta: { card: "detail", cardOrder: 2, align: "right" },
    cell: ({ getValue }) => (
      <span className="text-texto tabular">{formatBolivianos(getValue())}</span>
    ),
  }),
  columns.accessor((row) => row.decidedAt ?? row.submittedAt, {
    id: "fecha",
    header: "Fecha",
    meta: { card: "detail", cardOrder: 3 },
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-texto tabular">
        {formatDateTime(getValue())}
      </span>
    ),
  }),
  columns.accessor("state", {
    header: "Estado",
    cell: ({ row }) => (
      <span className="inline-flex flex-col gap-1">
        <PaymentStatePill state={row.original.state} />
        {row.original.voidReason ? (
          <span className="tipo-secundario text-texto">
            {row.original.voidReason}
          </span>
        ) : null}
      </span>
    ),
  }),
  columns.display({
    id: "invoice",
    header: "Factura",
    meta: { card: "actions" },
    cell: ({ row }) => <InvoiceCell payment={row.original} />,
  }),
  columns.display({
    id: "acciones",
    header: "",
    cell: ({ row }) => (
      <PaymentRowMenu
        payment={row.original}
        onOpen={() => open(row.original)}
      />
    ),
  }),
];
