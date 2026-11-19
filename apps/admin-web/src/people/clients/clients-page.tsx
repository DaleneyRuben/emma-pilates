import type { AdminPromotionContactDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CatalogPage } from "../../catalog/catalog-page";
import { ClientPhoto } from "../../components/client-photo";
import type { SearchChange } from "../../catalog/catalog-search";
import { PageNotice } from "../../components/page/page-notice";
import { countFormat } from "../../components/table/pagination";
import { SearchFilter } from "../../components/table/search-filter";
import { Button } from "../../components/ui/button";
import { useAdminRole } from "../../session/admin-role";
import type { ClientFilter, ClientSearch } from "../people-search";
import { clientColumns } from "./client-columns";
import { ClientFilterChips } from "./client-filter-chips";
import { clientTableQueryOptions } from "./client-queries";
import { ClientDetailPanel } from "./client-detail-panel";
import { closedAccountColumns } from "./closed-accounts/closed-account-columns";
import { closedAccountTableQueryOptions } from "./closed-accounts/closed-account-queries";
import { founderPlacesQueryOptions } from "./founder-places-query";
import { useClientsExport } from "./use-clients-export";

// Follow-up 28: every phrase that counts people is feminine.
const clientas = (count: number) =>
  `${countFormat.format(count)} ${count === 1 ? "clienta" : "clientas"}`;
const fundadoras = (count: number) =>
  `${countFormat.format(count)} ${count === 1 ? "fundadora" : "fundadoras"}`;
const exclientas = (count: number) =>
  `${countFormat.format(count)} ${count === 1 ? "exclienta" : "exclientas"}`;

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

// FIX-090: a chip with nobody under it says so; the first-run message is
// for a studio with no Clients at all.
const emptyChip: Record<Exclude<ClientFilter, "closed">, string> = {
  active: "Ninguna clienta con plan activo.",
  none: "Ninguna clienta sin plan.",
  expired: "Ninguna clienta con el plan vencido.",
  founder: "Ninguna clienta fundadora.",
};

function EmptyDirectory({
  searching,
  filter,
}: {
  searching: boolean;
  filter: ClientFilter | undefined;
}) {
  if (searching) {
    return (
      <span className="flex flex-col items-center gap-1">
        <span className="text-texto-secundario">
          No se encontró ninguna clienta.
        </span>
        <span className="text-nota text-texto-tenue">
          Revisa cómo escribiste el nombre o el teléfono.
        </span>
        <span className="text-ayuda text-texto-muy-tenue">{origin}</span>
      </span>
    );
  }
  if (filter !== undefined && filter !== "closed") {
    return <span className="text-texto-secundario">{emptyChip[filter]}</span>;
  }
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">Todavía no hay clientas.</span>
      <span className="text-ayuda text-texto-muy-tenue">{origin}</span>
    </span>
  );
}

function EmptyClosedAccounts({ searching }: { searching: boolean }) {
  return searching ? (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">
        No se encontró ninguna exclienta.
      </span>
      <span className="text-nota text-texto-tenue">
        Revisa cómo escribiste el nombre, el correo o el teléfono.
      </span>
    </span>
  ) : (
    <span className="text-texto-secundario">
      Nadie cerró su cuenta pidiendo seguir recibiendo promociones.
    </span>
  );
}

// AW21 with follow-ups 25 and 28: a read-only directory of every Client for
// support lookups; accounts are born in the Staff app or by registration.
// Follow-up 232 (WEB-040): chips for the plan state and Fundadora, and the
// columns «Le quedan», «Vence», and «Invitada por». Follow-up 268 (FIX-065,
// walkthrough finding 91): a sixth chip, «Cuenta cerrada», lists the former
// Clients who asked for promotions (AW35's, which is gone), and «Exportar
// CSV» downloads what the chip and the search show.
export function ClientsPage({
  search,
  onSearchChange,
  onLinkedClientSettled,
}: {
  search: ClientSearch;
  onSearchChange: SearchChange<ClientSearch>;
  /** Drops `cliente` from the address without a new history entry. */
  onLinkedClientSettled?: () => void;
}) {
  const closed = search.filter === "closed";
  // Under «Cuenta cerrada» the directory is read only for the studio counts.
  const query = useQuery(
    clientTableQueryOptions(
      // Todas' first page, so leaving the chip shows it from the cache.
      closed ? { page: 1, pageSize: search.pageSize } : search,
    ),
  );
  const closedQuery = useQuery({
    ...closedAccountTableQueryOptions(search),
    enabled: closed,
  });
  const studio = query.data?.studioClientCount;
  const role = useAdminRole();
  const [notice, setNotice] = useState<string | null>(null);
  const exportClients = useClientsExport(search);
  const changeSearch: SearchChange<ClientSearch> = (change) => {
    setNotice(null);
    exportClients.reset();
    onSearchChange(change);
  };
  const shown = closed ? closedQuery.data : query.data;
  const exportButton = (
    <Button
      variant="neutral"
      busy={exportClients.isPending}
      disabled={
        shown === undefined ||
        shown.totalItems === 0 ||
        (closed ? closedQuery.isPlaceholderData : query.isPlaceholderData)
      }
      onClick={() => {
        setNotice(null);
        exportClients.mutate(undefined, { onSuccess: setNotice });
      }}
    >
      <Download size={16} strokeWidth={1.8} aria-hidden="true" />
      Exportar CSV
    </Button>
  );
  const filter: ReactNode = (
    <div className="flex flex-col gap-3">
      <SearchFilter
        label="Buscar por nombre, correo o teléfono"
        value={search.q ?? ""}
        onChange={(text) =>
          changeSearch({ q: text === "" ? undefined : text, page: 1 })
        }
      />
      <ClientFilterChips
        value={search.filter}
        onChange={(chip) => changeSearch({ filter: chip, page: 1 })}
      />
      {search.filter === "founder" && role === "administrator" ? (
        <FounderPlaces />
      ) : null}
      {closed ? (
        <p className="text-nota text-texto-tenue">
          Exclientas que cerraron su cuenta y pidieron seguir recibiendo
          promociones. No tienen ficha.
        </p>
      ) : null}
      {exportClients.isError ? (
        <p
          role="alert"
          className="rounded-control bg-error-tinte px-3 py-2 text-nota text-error-texto"
        >
          No pudimos exportar las clientas. Inténtalo de nuevo.
        </p>
      ) : null}
      {notice === null ? null : <PageNotice>{notice}</PageNotice>}
    </div>
  );
  const shared = {
    title: "Clientas",
    subtitle:
      query.data === undefined
        ? undefined
        : `${clientas(query.data.studioClientCount)} · ${countFormat.format(query.data.activePlanClientCount)} con plan activo · ${fundadoras(query.data.founderClientCount)}`,
    actions: exportButton,
    filter,
    search,
    onPageChange: (page: number) => changeSearch({ page }),
    // A withdrawal can empty a later page: the step back to the last one
    // left keeps the line that says what happened.
    onPageClamp: (page: number) => onSearchChange({ page }),
  };

  if (closed) {
    return (
      <CatalogPage<AdminPromotionContactDto>
        {...shared}
        loadingMessage="Cargando exclientas…"
        what="las exclientas"
        emptyMessage={
          <EmptyClosedAccounts searching={search.q !== undefined} />
        }
        rangeLabel={({ shown: count }) =>
          `Mostrando ${countFormat.format(count)} de ${exclientas(closedQuery.data?.totalItems ?? 0)}`
        }
        query={closedQuery}
        columns={() => closedAccountColumns(setNotice)}
      />
    );
  }
  return (
    <CatalogPage
      {...shared}
      loadingMessage="Cargando clientas…"
      what="las clientas"
      emptyMessage={
        <EmptyDirectory
          searching={search.q !== undefined}
          filter={search.filter}
        />
      }
      panelTitles={{ create: "Detalle de cliente", edit: (row) => row.name }}
      rangeLabel={({ shown: count }) =>
        `Mostrando ${countFormat.format(count)} de ${clientas(studio ?? 0)}`
      }
      query={query}
      openRowId={search.cliente}
      onLinkSettled={onLinkedClientSettled}
      columns={clientColumns}
      avatar={(client) => (
        <ClientPhoto name={client.name} photo={client.photo} size={40} />
      )}
      renderForm={(client, done) =>
        client === undefined ? null : (
          <ClientDetailPanel clientId={client.id} onClosed={done} />
        )
      }
    />
  );
}
