import type { AdminPromotionContactDto } from "@pilates/api-contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useState } from "react";
import type { SearchChange } from "../../catalog/catalog-search";
import { isForbidden } from "../../components/page/is-forbidden";
import { PageHeader } from "../../components/page/page-header";
import { PageNotice } from "../../components/page/page-notice";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { DataTable } from "../../components/table/data-table";
import { countFormat } from "../../components/table/pagination";
import { SearchFilter } from "../../components/table/search-filter";
import { Button } from "../../components/ui/button";
import { saveFile } from "../../lib/save-file";
import type { ClientSearch } from "../../people/people-search";
import {
  contactTableQueryOptions,
  fetchAllPromotionContacts,
} from "./contact-queries";
import {
  consentDate,
  contactsCsvName,
  promotionContactsCsv,
} from "./contacts-csv";
import { WithdrawContactAction } from "./withdraw-contact-action";

const contactos = (count: number) =>
  `${countFormat.format(count)} ${count === 1 ? "contacto" : "contactos"}`;

const columns = createColumnHelper<AdminPromotionContactDto>();

const contactColumns = (onWithdrawn: (notice: string) => void) => [
  columns.accessor("name", {
    header: "Nombre",
    cell: ({ getValue }) => (
      <span className="font-medium text-texto">{getValue()}</span>
    ),
  }),
  columns.accessor("email", {
    header: "Correo",
    cell: ({ getValue }) => (
      <span className="break-all text-texto-secundario">{getValue()}</span>
    ),
  }),
  columns.accessor("phone", {
    header: "Teléfono",
    cell: ({ getValue }) => {
      const phone = getValue();
      return phone === null ? (
        <span className="text-texto-muy-tenue">—</span>
      ) : (
        <span className="text-texto-secundario tabular">{phone}</span>
      );
    },
  }),
  columns.accessor("consentedAt", {
    header: "Aceptó el",
    cell: ({ row }) => (
      <span className="text-texto-secundario tabular">
        {consentDate(row.original)}
      </span>
    ),
  }),
  columns.display({
    id: "withdraw",
    header: "",
    meta: { align: "right" },
    cell: ({ row }) => (
      <WithdrawContactAction contact={row.original} onWithdrawn={onWithdrawn} />
    ),
  }),
];

function EmptyContacts({ searching }: { searching: boolean }) {
  return searching ? (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">
        No se encontró ningún contacto.
      </span>
      <span className="text-nota text-texto-tenue">
        Revisa cómo escribiste el nombre, el correo o el teléfono.
      </span>
    </span>
  ) : (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">Todavía no hay contactos.</span>
      <span className="text-nota text-texto-tenue">
        Aparecen aquí cuando una clienta cierra su cuenta y marca que quiere
        seguir recibiendo promociones.
      </span>
    </span>
  );
}

// AW35 (BE-022): the Promotion Contacts ADR-0097 keeps for former Clients
// who asked for promotions; reached from AW17, studio-wide.
export function ContactsPage({
  search,
  onSearchChange,
}: {
  search: ClientSearch;
  onSearchChange: SearchChange<ClientSearch>;
}) {
  const query = useQuery(contactTableQueryOptions(search));
  const [notice, setNotice] = useState<string | null>(null);
  const exportContacts = useMutation({
    mutationFn: fetchAllPromotionContacts,
    onSuccess: (contacts) =>
      saveFile(
        contactsCsvName(new Date()),
        promotionContactsCsv(contacts),
        "text/csv;charset=utf-8",
      ),
  });
  const noContacts = search.q === undefined && query.data?.totalItems === 0;

  return (
    <article className="flex flex-col gap-5">
      <Link
        to="/promociones"
        className="self-start text-nota text-primario hover:text-primario-presionado"
      >
        ← Promociones
      </Link>
      <PageHeader
        title="Contactos para promociones"
        subtitle={
          query.data === undefined
            ? undefined
            : `${contactos(query.data.totalItems)} · personas que cerraron su cuenta y pidieron seguir recibiendo promociones`
        }
        actions={
          isForbidden(query.error) ? undefined : (
            <Button
              variant="neutral"
              busy={exportContacts.isPending}
              disabled={query.data === undefined || noContacts}
              onClick={() => {
                setNotice(null);
                exportContacts.mutate();
              }}
            >
              <Download size={16} strokeWidth={1.8} aria-hidden="true" />
              Exportar CSV
            </Button>
          )
        }
      />
      <SearchFilter
        label="Buscar por nombre, correo o teléfono"
        value={search.q ?? ""}
        onChange={(text) =>
          onSearchChange({ q: text === "" ? undefined : text, page: 1 })
        }
      />
      {exportContacts.isError ? (
        <p
          role="alert"
          className="rounded-control bg-error/10 px-3 py-2 text-nota text-error-texto"
        >
          No pudimos exportar los contactos. Inténtalo de nuevo.
        </p>
      ) : null}
      {notice === null ? null : <PageNotice>{notice}</PageNotice>}
      {query.isPending ? (
        <LoadingNotice>Cargando contactos…</LoadingNotice>
      ) : query.isError ? (
        <QueryFailure
          error={query.error}
          what="los contactos"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable
          columns={contactColumns(setNotice)}
          rows={query.data.items}
          rowId={(row) => row.id}
          emptyMessage={<EmptyContacts searching={search.q !== undefined} />}
          pagination={{
            page: search.page,
            pageSize: search.pageSize,
            totalItems: query.data.totalItems,
            onPageChange: (page) => onSearchChange({ page }),
            rangeLabel: ({ shown }) =>
              `Mostrando ${countFormat.format(shown)} de ${contactos(query.data.totalItems)}`,
          }}
        />
      )}
    </article>
  );
}
