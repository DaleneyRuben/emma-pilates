import type { AdminClientDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { CatalogPage, RowOpener } from "../../catalog/catalog-page";
import type { SearchChange } from "../../catalog/catalog-search";
import { countFormat } from "../../components/table/pagination";
import { SearchFilter } from "../../components/table/search-filter";
import { StatusPill } from "../../components/ui/status-pill";
import type { ClientSearch } from "../people-search";
import { clientTableQueryOptions } from "./client-queries";
import { ClientDetailPanel } from "./client-detail-panel";

// Follow-up 28: every phrase that counts people is feminine.
const clientas = (count: number) =>
  `${countFormat.format(count)} ${count === 1 ? "clienta" : "clientas"}`;

const origin =
  "Las cuentas se crean desde la app del personal o cuando la clienta se registra.";

const columns = createColumnHelper<AdminClientDto>();

const clientColumns = (open: (row: AdminClientDto) => void) => [
  columns.accessor("name", {
    header: "Nombre",
    cell: ({ row }) => (
      <RowOpener label={row.original.name} onOpen={() => open(row.original)} />
    ),
  }),
  columns.accessor("email", {
    header: "Contacto",
    cell: ({ row }) => (
      <span className="flex flex-col text-nota text-texto-secundario">
        <span>{row.original.email}</span>
        {row.original.phone === null ? null : (
          <span className="text-texto-muy-tenue tabular">
            {row.original.phone}
          </span>
        )}
      </span>
    ),
  }),
  columns.accessor("planName", {
    header: "Plan",
    cell: ({ getValue }) => {
      const plan = getValue();
      return plan === null ? (
        <span className="text-texto-muy-tenue">Sin plan activo</span>
      ) : (
        <span className="text-texto-secundario">{plan}</span>
      );
    },
  }),
  columns.accessor("subscriptionStatus", {
    header: "Estado",
    cell: ({ getValue }) => {
      switch (getValue()) {
        case "active":
          return <StatusPill tone="exito">Activo</StatusPill>;
        case "expired":
          return <StatusPill tone="error">Expirado</StatusPill>;
        default:
          // Never bought a Plan: nothing expired (follow-up 54).
          return <StatusPill tone="neutral">Sin plan</StatusPill>;
      }
    },
  }),
];

function EmptyDirectory({ searching }: { searching: boolean }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">
        {searching
          ? "No se encontró ninguna clienta."
          : "Todavía no hay clientas."}
      </span>
      {searching ? (
        <span className="text-nota text-texto-tenue">
          Revisa cómo escribiste el nombre o el teléfono.
        </span>
      ) : null}
      <span className="text-ayuda text-texto-muy-tenue">{origin}</span>
    </span>
  );
}

// AW21 with follow-ups 25 and 28: a read-only directory of every Client for
// support lookups; accounts are born in the Staff app or by registration.
export function ClientsPage({
  search,
  onSearchChange,
}: {
  search: ClientSearch;
  onSearchChange: SearchChange<ClientSearch>;
}) {
  const query = useQuery(clientTableQueryOptions(search));
  const studio = query.data?.studioClientCount;

  return (
    <CatalogPage
      title="Clientes"
      subtitle={
        query.data === undefined
          ? undefined
          : `${clientas(query.data.studioClientCount)} · ${countFormat.format(query.data.activePlanClientCount)} con plan activo`
      }
      loadingMessage="Cargando clientas…"
      what="las clientas"
      emptyMessage={<EmptyDirectory searching={search.q !== undefined} />}
      panelTitles={{ create: "Detalle de cliente", edit: (row) => row.name }}
      actions={
        <Link
          to="/back-office/clientes/campana"
          className="inline-flex h-[38px] items-center rounded-control bg-primario px-4 text-cuerpo font-medium text-blanco shadow-boton hover:bg-primario-hover"
        >
          Dar clases de campaña
        </Link>
      }
      filter={
        <SearchFilter
          label="Buscar por nombre, correo o teléfono"
          value={search.q ?? ""}
          onChange={(text) =>
            onSearchChange({ q: text === "" ? undefined : text, page: 1 })
          }
        />
      }
      search={search}
      onPageChange={(page) => onSearchChange({ page })}
      rangeLabel={({ shown }) =>
        `Mostrando ${countFormat.format(shown)} de ${clientas(studio ?? 0)}`
      }
      query={query}
      columns={clientColumns}
      renderForm={(client, done) =>
        client === undefined ? null : (
          <ClientDetailPanel clientId={client.id} onClosed={done} />
        )
      }
    />
  );
}
