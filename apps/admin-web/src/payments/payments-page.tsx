import { useMutation, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { CatalogPage } from "../catalog/catalog-page";
import type { SearchChange } from "../catalog/catalog-search";
import { countFormat } from "../components/table/pagination";
import { SearchFilter } from "../components/table/search-filter";
import { Button } from "../components/ui/button";
import { chipClass, selectedClass } from "../components/ui/chip";
import { FilterChips } from "../components/ui/filter-chips";
import { cn } from "../lib/cn";
import { saveFile } from "../lib/save-file";
import { InvoicePanel } from "./invoice-panel";
import { fetchAllPayments } from "./invoice-queries";
import { canOpenPayment, paymentColumns } from "./payment-columns";
import { paymentTableQueryOptions } from "./payment-queries";
import { PaymentReviewPanel } from "./payment-review-panel";
import type { PaymentSearch, PaymentStatusFilter } from "./payment-search";
import { paymentsCsv, paymentsCsvName } from "./payments-csv";

type StatusChip = Exclude<PaymentStatusFilter, "all">;

// FIX-091 (W4 B): the Estado filter as chips, the review queue with its
// studio-wide count.
const statusOptions = (pendingCount: number | undefined) =>
  [
    { value: undefined, label: "Todos" },
    { value: "pending", label: "Por revisar", count: pendingCount },
    { value: "confirmed", label: "Confirmados" },
    { value: "rejected", label: "Rechazados" },
    { value: "voided", label: "Anulados" },
  ] as const;

const nouns: Record<PaymentStatusFilter, [string, string]> = {
  all: ["pago", "pagos"],
  pending: ["pago por revisar", "pagos por revisar"],
  confirmed: ["pago confirmado", "pagos confirmados"],
  rejected: ["pago rechazado", "pagos rechazados"],
  voided: ["venta anulada", "ventas anuladas"],
};

const empty: Record<PaymentStatusFilter, [string, string?]> = {
  pending: [
    "No hay pagos pendientes.",
    "Todo al día. Cuando una clienta envíe un comprobante, aparece aquí.",
  ],
  confirmed: ["Todavía no hay pagos confirmados."],
  rejected: ["Todavía no hay pagos rechazados."],
  voided: ["Todavía no hay ventas anuladas."],
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
      <span className="text-texto">{message}</span>
      {hint === undefined ? null : (
        <span className="text-nota text-texto">{hint}</span>
      )}
      <span className="text-ayuda text-texto">
        Las clientas pagan por QR desde la app y la asistente registra el
        efectivo; aquí se revisan y se marcan las facturas.
      </span>
    </span>
  );
}

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
      subtitle="Todo el estudio"
      loadingMessage="Cargando pagos…"
      what="los pagos"
      emptyMessage={<EmptyPayments search={search} />}
      panelTitles={{
        create: "Revisar pago",
        edit: (row) => (row.state === "pending" ? "Revisar pago" : "Factura"),
      }}
      panelDescription={(row) => `${row.clientName} · ${row.planName}`}
      canOpen={canOpenPayment}
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
        <div className="flex flex-col gap-3">
          <SearchFilter
            label="Buscar por clienta"
            value={search.q ?? ""}
            onChange={(text) =>
              onSearchChange({ q: text === "" ? undefined : text, page: 1 })
            }
          />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <FilterChips<StatusChip>
              label="Estado"
              value={search.status === "all" ? undefined : search.status}
              options={statusOptions(query.data?.pendingCount)}
              onChange={(status) =>
                onSearchChange({ status: status ?? "all", page: 1 })
              }
            />
            <button
              type="button"
              aria-pressed={search.invoice === "unissued"}
              onClick={() =>
                onSearchChange({
                  invoice:
                    search.invoice === "unissued" ? undefined : "unissued",
                  page: 1,
                })
              }
              className={cn(
                chipClass,
                search.invoice === "unissued" && selectedClass,
              )}
            >
              Factura por subir
            </button>
          </div>
          {exportPayments.isError ? (
            <p
              role="alert"
              className="w-full rounded-control bg-aviso px-3 py-2 text-nota text-texto"
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
        payment === undefined ? null : payment.state === "pending" ? (
          <PaymentReviewPanel payment={payment} onDone={done} />
        ) : (
          <InvoicePanel payment={payment} />
        )
      }
    />
  );
}
