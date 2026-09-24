import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { CatalogPage } from "../../catalog/catalog-page";
import type { SearchChange } from "../../catalog/catalog-search";
import { countFormat, pageRangeLabel } from "../../components/table/pagination";
import { SearchFilter } from "../../components/table/search-filter";
import { boliviaParts, formatCivilDate } from "../../lib/bolivia-time";
import { formatBolivianos } from "../../lib/money";
import type { NameSearch } from "../oversight-search";
import { creditTableQueryOptions, type CreditRow } from "./credit-queries";

// Follow-up 28: every phrase that counts people is feminine.
const clientas = (count: number) =>
  `${countFormat.format(count)} ${count === 1 ? "clienta" : "clientas"} con crédito`;

// What the last ledger entry did (booking/CONTEXT.md, Credit): earned by a
// Referral, reserved while a purchase is open, spent when its Payment is
// confirmed, or returned when the purchase expires or is rejected.
const movements = {
  earned: "Crédito ganado",
  reserved: "Reservado para un pago",
  spent: "Usado en un pago",
  returned: "Devuelto al saldo",
} as const;

const columns = createColumnHelper<CreditRow>();

// No manual adjustment and no movement panel (AW27).
const creditColumns = () => [
  columns.accessor("clientName", {
    header: "Cliente",
    cell: ({ getValue }) => (
      <span className="font-medium text-texto">{getValue()}</span>
    ),
  }),
  columns.accessor("availableCentavos", {
    header: "Saldo de crédito",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-texto tabular">{formatBolivianos(getValue())}</span>
    ),
  }),
  columns.accessor("lastMovementAt", {
    header: "Última actividad",
    cell: ({ row }) => (
      <span className="flex flex-col">
        <span className="text-texto-secundario tabular">
          {formatCivilDate(boliviaParts(row.original.lastMovementAt).date)}
        </span>
        <span className="text-ayuda text-texto-tenue">
          {movements[row.original.lastMovementKind]}
        </span>
      </span>
    ),
  }),
];

function EmptyCredits({ searching }: { searching: boolean }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">
        {searching
          ? "No se encontró ninguna clienta con crédito."
          : "Ninguna clienta tiene crédito disponible."}
      </span>
      <span className="text-nota text-texto-tenue">
        {searching
          ? "Revisa cómo escribiste el nombre."
          : "El crédito se gana con los referidos y se usa al confirmar un pago."}
      </span>
    </span>
  );
}

// AW27: the Clients whose available Credit is above zero, for support and
// reconciliation; the balance moves only through Referrals and Payments.
export function CreditsPage({
  search,
  onSearchChange,
}: {
  search: NameSearch;
  onSearchChange: SearchChange<NameSearch>;
}) {
  const query = useQuery(creditTableQueryOptions(search));
  const searching = search.q !== undefined;
  const outstanding =
    query.data === undefined
      ? undefined
      : formatBolivianos(query.data.outstandingCentavos);

  return (
    <CatalogPage
      title="Créditos"
      subtitle={
        query.data === undefined
          ? undefined
          : searching
            ? `${outstanding} en saldo activo`
            : `${outstanding} en saldo activo · ${clientas(query.data.totalItems)}`
      }
      loadingMessage="Cargando créditos…"
      what="los créditos"
      emptyMessage={<EmptyCredits searching={searching} />}
      filter={
        <SearchFilter
          label="Buscar por nombre de cliente"
          value={search.q ?? ""}
          onChange={(text) =>
            onSearchChange({ q: text === "" ? undefined : text, page: 1 })
          }
        />
      }
      search={search}
      onPageChange={(page) => onSearchChange({ page })}
      rangeLabel={(window) =>
        window.totalItems === 0
          ? pageRangeLabel(window)
          : `${pageRangeLabel(window)} ${window.totalItems === 1 ? "clienta" : "clientas"} con crédito`
      }
      query={query}
      columns={creditColumns}
      footer={
        // The studio total closes the table only when every Client counts;
        // a searched page would not add up to it.
        searching ||
        query.data === undefined ||
        query.data.totalItems === 0 ? null : (
          <section
            aria-label="Total en saldo activo"
            className="flex items-center justify-between gap-3 rounded-control border border-divisor bg-superficie px-3 py-2.5"
          >
            <h2 className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
              Total en saldo activo
            </h2>
            <p className="text-celda font-medium text-texto tabular">
              {outstanding}
            </p>
          </section>
        )
      }
    />
  );
}
