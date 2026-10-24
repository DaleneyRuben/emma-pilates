import type { AdminPaymentDto } from "@pilates/api-contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { CatalogPage, RowOpener } from "../catalog/catalog-page";
import type { SearchChange } from "../catalog/catalog-search";
import { ListFilter } from "../components/table/list-filter";
import { countFormat } from "../components/table/pagination";
import { SearchFilter } from "../components/table/search-filter";
import { Button } from "../components/ui/button";
import { formatCivilMoment } from "../lib/bolivia-time";
import { initials } from "../lib/initials";
import { formatBolivianos } from "../lib/money";
import { saveFile } from "../lib/save-file";
import { InvoiceCell } from "./invoice-cell";
import { fetchAllPayments } from "./invoice-queries";
import { paymentTableQueryOptions } from "./payment-queries";
import { PaymentReviewPanel } from "./payment-review-panel";
import type { PaymentSearch, PaymentStatusFilter } from "./payment-search";
import { PaymentStatePill } from "./payment-state-pill";
import { methodLabels, paymentsCsv, paymentsCsvName } from "./payments-csv";

type InvoiceFilter = "all" | "unissued";

const invoiceOptions: { value: InvoiceFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unissued", label: "Sin factura emitida" },
];

const statusOptions: { value: PaymentStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "rejected", label: "Rechazado" },
];

const nouns: Record<PaymentStatusFilter, [string, string]> = {
  all: ["pago", "pagos"],
  pending: ["pago pendiente", "pagos pendientes"],
  confirmed: ["pago confirmado", "pagos confirmados"],
  rejected: ["pago rechazado", "pagos rechazados"],
};

const waiting = (count: number) =>
  count === 0
    ? "Todo el estudio · ninguna transferencia por revisar"
    : `Todo el estudio · ${countFormat.format(count)} ${count === 1 ? "transferencia esperando" : "transferencias esperando"} revisión`;

const empty: Record<PaymentStatusFilter, [string, string?]> = {
  pending: [
    "No hay pagos pendientes.",
    "Todo al día. Cuando una clienta envíe un comprobante, aparece aquí.",
  ],
  confirmed: ["Todavía no hay pagos confirmados."],
  rejected: ["Todavía no hay pagos rechazados."],
  all: ["Todavía no hay pagos."],
};

function EmptyPayments({ search }: { search: PaymentSearch }) {
  const [message, hint] =
    search.q !== undefined
      ? [
          "No se encontró ningún pago.",
          "Revisa cómo escribiste el nombre de la clienta.",
        ]
      : search.invoice === "unissued"
        ? [
            "No hay facturas pendientes.",
            "Cuando una venta con datos de factura se confirma, aparece aquí.",
          ]
        : empty[search.status];
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">{message}</span>
      {hint === undefined ? null : (
        <span className="text-nota text-texto-tenue">{hint}</span>
      )}
      <span className="text-ayuda text-texto-muy-tenue">
        Las clientas envían sus transferencias desde la app y la recepción
        registra el efectivo; aquí se revisan y se marcan las facturas.
      </span>
    </span>
  );
}

const columns = createColumnHelper<AdminPaymentDto>();

const paymentColumns = (open: (row: AdminPaymentDto) => void) => [
  columns.accessor("clientName", {
    header: "Cliente",
    cell: ({ row }) => (
      <span className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primario-tinte text-[11px] font-medium text-primario-profundo"
        >
          {initials(row.original.clientName)}
        </span>
        {row.original.state === "pending" ? (
          <RowOpener
            label={row.original.clientName}
            onOpen={() => open(row.original)}
          />
        ) : (
          <span className="font-medium text-texto">
            {row.original.clientName}
          </span>
        )}
      </span>
    ),
  }),
  columns.accessor("planName", {
    header: "Plan",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario">{getValue()}</span>
    ),
  }),
  columns.accessor("method", {
    header: "Método",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario">{methodLabels[getValue()]}</span>
    ),
  }),
  // The amount paid (ADR-0082); Credit is retired (PAY-005).
  columns.accessor("amountDueCentavos", {
    header: "Monto",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-texto tabular">{formatBolivianos(getValue())}</span>
    ),
  }),
  columns.accessor("submittedAt", {
    header: "Fecha",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario tabular">
        {formatCivilMoment(getValue())}
      </span>
    ),
  }),
  columns.accessor("state", {
    header: "Estado",
    cell: ({ getValue }) => <PaymentStatePill state={getValue()} />,
  }),
  columns.display({
    id: "invoice",
    header: "Factura",
    cell: ({ row }) => <InvoiceCell payment={row.original} />,
  }),
];

// AW28 (ADR-0006): every transfer Payment of the studio, for review from a
// desk; the Staff app's queue (S11/S12) works on the same Payments. Since
// PAY-007 the cash sales are listed too, with the Invoice Data, the
// «Factura emitida» mark, and the accountant's CSV (follow-up 147).
export function PaymentsPage({
  search,
  onSearchChange,
}: {
  search: PaymentSearch;
  onSearchChange: SearchChange<PaymentSearch>;
}) {
  const query = useQuery(paymentTableQueryOptions(search));
  const [one, many] = nouns[search.status];
  const exportPayments = useMutation({
    mutationFn: () => fetchAllPayments(search),
    onSuccess: (rows) =>
      saveFile(
        paymentsCsvName(new Date()),
        paymentsCsv(rows),
        "text/csv;charset=utf-8",
      ),
  });

  return (
    <CatalogPage
      title="Pagos"
      subtitle={
        query.data === undefined ? undefined : waiting(query.data.pendingCount)
      }
      loadingMessage="Cargando pagos…"
      what="los pagos"
      emptyMessage={<EmptyPayments search={search} />}
      panelTitles={{ create: "Revisar pago", edit: "Revisar pago" }}
      panelDescription={(row) => `${row.clientName} · ${row.planName}`}
      canOpen={(row) => row.state === "pending"}
      links={
        <Button
          variant="neutral"
          busy={exportPayments.isPending}
          disabled={query.data === undefined}
          onClick={() => exportPayments.mutate()}
        >
          <Download size={16} strokeWidth={1.8} aria-hidden="true" />
          Exportar CSV
        </Button>
      }
      filter={
        <div className="flex flex-wrap items-center gap-3">
          <SearchFilter
            label="Buscar por cliente"
            value={search.q ?? ""}
            onChange={(text) =>
              onSearchChange({ q: text === "" ? undefined : text, page: 1 })
            }
          />
          <ListFilter
            label="Estado"
            value={search.status}
            options={statusOptions}
            onChange={(status) => onSearchChange({ status, page: 1 })}
          />
          <ListFilter
            label="Factura"
            value={search.invoice ?? "all"}
            options={invoiceOptions}
            onChange={(invoice) =>
              onSearchChange({
                invoice: invoice === "all" ? undefined : invoice,
                page: 1,
              })
            }
          />
          {exportPayments.isError ? (
            <p
              role="alert"
              className="w-full rounded-control bg-error/10 px-3 py-2 text-nota text-error-texto"
            >
              No pudimos exportar los pagos. Inténtalo de nuevo.
            </p>
          ) : null}
        </div>
      }
      search={search}
      onPageChange={(page) => onSearchChange({ page })}
      rangeLabel={({ shown, totalItems }) =>
        `Mostrando ${countFormat.format(shown)} de ${countFormat.format(totalItems)} ${totalItems === 1 ? one : many}`
      }
      query={query}
      columns={paymentColumns}
      renderForm={(payment, done) =>
        payment === undefined ? null : (
          <PaymentReviewPanel payment={payment} onDone={done} />
        )
      }
    />
  );
}
