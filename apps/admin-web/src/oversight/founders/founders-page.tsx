import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { CatalogPage } from "../../catalog/catalog-page";
import { StatusPill } from "../../components/ui/status-pill";
import { formatCivilDate } from "../../lib/bolivia-time";
import { founderListQueryOptions, type FounderRow } from "./founder-queries";

const columns = createColumnHelper<FounderRow>();

const founderColumns = () => [
  columns.accessor("number", {
    header: "Número",
    cell: ({ getValue }) => (
      <span className="tabular text-texto">{getValue()}</span>
    ),
  }),
  columns.accessor("clientName", {
    header: "Clienta",
    cell: ({ getValue }) => (
      <span className="font-medium text-texto">{getValue()}</span>
    ),
  }),
  columns.accessor("since", {
    header: "Desde",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario tabular">
        {formatCivilDate(getValue())}
      </span>
    ),
  }),
  columns.accessor("status", {
    header: "Estado",
    cell: ({ getValue }) =>
      getValue() === "active" ? (
        <StatusPill tone="exito">Activa</StatusPill>
      ) : (
        <StatusPill tone="neutral">Perdida</StatusPill>
      ),
  }),
];

function EmptyFounders() {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">Todavía no hay fundadoras.</span>
      <span className="text-ayuda text-texto-tenue">
        El lugar se otorga al confirmarse el primer pago real.
      </span>
    </span>
  );
}

// AW37: a read-only list. Places are assigned at confirmation, so there is
// no create action and a row opens nothing.
export function FoundersPage() {
  const query = useQuery(founderListQueryOptions());
  const page = query.data;

  return (
    <CatalogPage
      title="Fundadoras"
      subtitle={
        page === undefined
          ? undefined
          : `${page.granted} de ${page.places} lugares`
      }
      loadingMessage="Cargando fundadoras…"
      what="las fundadoras"
      emptyMessage={<EmptyFounders />}
      filter={null}
      search={{ page: 1, pageSize: 40 }}
      onPageChange={() => undefined}
      query={query}
      columns={founderColumns}
    />
  );
}
