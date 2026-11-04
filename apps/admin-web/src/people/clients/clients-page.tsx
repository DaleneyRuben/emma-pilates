import { useQuery } from "@tanstack/react-query";
import { CatalogPage } from "../../catalog/catalog-page";
import type { SearchChange } from "../../catalog/catalog-search";
import { countFormat } from "../../components/table/pagination";
import { SearchFilter } from "../../components/table/search-filter";
import { useAdminRole } from "../../session/admin-role";
import type { ClientSearch } from "../people-search";
import { clientColumns } from "./client-columns";
import { ClientFilterChips } from "./client-filter-chips";
import { clientTableQueryOptions } from "./client-queries";
import { ClientDetailPanel } from "./client-detail-panel";
import { founderPlacesQueryOptions } from "./founder-places-query";

// Follow-up 28: every phrase that counts people is feminine.
const clientas = (count: number) =>
  `${countFormat.format(count)} ${count === 1 ? "clienta" : "clientas"}`;
const fundadoras = (count: number) =>
  `${countFormat.format(count)} ${count === 1 ? "fundadora" : "fundadoras"}`;

// The old Fundadoras page's subtitle, under the Fundadora chip for the
// Administrator only (ADR-0102, ADR-0108).
function FounderPlaces() {
  const places = useQuery(founderPlacesQueryOptions());
  if (places.data === undefined) return null;
  return (
    <p className="text-nota text-texto-tenue">
      {countFormat.format(places.data.granted)} de{" "}
      {countFormat.format(places.data.places)} lugares de fundadora otorgados
    </p>
  );
}

const origin =
  "Las cuentas se crean desde la app del personal o cuando la clienta se registra.";

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
// Follow-up 232 (WEB-040): chips for the plan state and Fundadora, and the
// columns «Le quedan», «Vence», and «Invitada por».
export function ClientsPage({
  search,
  onSearchChange,
}: {
  search: ClientSearch;
  onSearchChange: SearchChange<ClientSearch>;
}) {
  const query = useQuery(clientTableQueryOptions(search));
  const studio = query.data?.studioClientCount;
  const role = useAdminRole();

  return (
    <CatalogPage
      title="Clientes"
      subtitle={
        query.data === undefined
          ? undefined
          : `${clientas(query.data.studioClientCount)} · ${countFormat.format(query.data.activePlanClientCount)} con plan activo · ${fundadoras(query.data.founderClientCount)}`
      }
      loadingMessage="Cargando clientas…"
      what="las clientas"
      emptyMessage={<EmptyDirectory searching={search.q !== undefined} />}
      panelTitles={{ create: "Detalle de cliente", edit: (row) => row.name }}
      filter={
        <div className="flex flex-col gap-3">
          <SearchFilter
            label="Buscar por nombre, correo o teléfono"
            value={search.q ?? ""}
            onChange={(text) =>
              onSearchChange({ q: text === "" ? undefined : text, page: 1 })
            }
          />
          <ClientFilterChips
            value={search.filter}
            onChange={(filter) => onSearchChange({ filter, page: 1 })}
          />
          {search.filter === "founder" && role === "administrator" ? (
            <FounderPlaces />
          ) : null}
        </div>
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
