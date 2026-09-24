import type { AdminPaymentDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { CatalogPage, RowOpener } from "../catalog/catalog-page";
import type { SearchChange } from "../catalog/catalog-search";
import { ListFilter } from "../components/table/list-filter";
import { countFormat } from "../components/table/pagination";
import { SearchFilter } from "../components/table/search-filter";
import { formatCivilMoment } from "../lib/bolivia-time";
import { initials } from "../lib/initials";
import { formatBolivianos } from "../lib/money";
import { paymentTableQueryOptions } from "./payment-queries";
import { PaymentReviewPanel } from "./payment-review-panel";
import type { PaymentSearch, PaymentStatusFilter } from "./payment-search";
import { PaymentStatePill } from "./payment-state-pill";

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
  all: ["Todavía no hay transferencias."],
};

function EmptyPayments({ search }: { search: PaymentSearch }) {
  const [message, hint] =
    search.q === undefined
      ? empty[search.status]
      : [
          "No se encontró ningún pago.",
          "Revisa cómo escribiste el nombre de la clienta.",
        ];
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">{message}</span>
      {hint === undefined ? null : (
        <span className="text-nota text-texto-tenue">{hint}</span>
      )}
      <span className="text-ayuda text-texto-muy-tenue">
        Las clientas envían sus transferencias desde la app; aquí solo se
        revisan.
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
  // The amount asked is the Plan price less the Credit applied (ADR-0082).
  columns.accessor("amountDueCentavos", {
    header: "Monto",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="inline-flex flex-col md:items-end">
        <span className="text-texto tabular">
          {formatBolivianos(row.original.amountDueCentavos)}
        </span>
        {row.original.creditAppliedCentavos > 0 ? (
          <span className="text-ayuda text-texto-tenue tabular">
            con {formatBolivianos(row.original.creditAppliedCentavos)} de
            crédito
          </span>
        ) : null}
      </span>
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
];

// AW28 (ADR-0006): every transfer Payment of the studio, for review from a
// desk; the Staff app's queue (S11/S12) works on the same Payments. Cash and
// Credit-only Payments are confirmed when recorded and never reach it.
export function PaymentsPage({
  search,
  onSearchChange,
}: {
  search: PaymentSearch;
  onSearchChange: SearchChange<PaymentSearch>;
}) {
  const query = useQuery(paymentTableQueryOptions(search));
  const [one, many] = nouns[search.status];

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
