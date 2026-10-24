import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { CatalogPage } from "../../catalog/catalog-page";
import type { SearchChange } from "../../catalog/catalog-search";
import { countFormat, pageRangeLabel } from "../../components/table/pagination";
import { SearchFilter } from "../../components/table/search-filter";
import { boliviaParts, formatCivilDate } from "../../lib/bolivia-time";
import type { NameSearch } from "../oversight-search";
import {
  referralTableQueryOptions,
  type ReferralRow,
} from "./referral-queries";

const count = (value: number, one: string, many: string) =>
  `${countFormat.format(value)} ${value === 1 ? one : many}`;

// The studio's Referrals, whatever the search (follow-up 28 counts people
// in the feminine; a Referral is a link, so it counts in the masculine).
// Credit is retired (PAY-005), so the count no longer splits by award.
const studioSummary = (total: number) =>
  total === 0
    ? "Todavía no hay referidos en el estudio"
    : count(total, "referido", "referidos");

const columns = createColumnHelper<ReferralRow>();

// The row is the whole record (AW26): no panel, no link.
const referralColumns = () => [
  columns.accessor("referrerName", {
    header: "Cliente que refiere",
    cell: ({ row }) => (
      <span className="flex flex-col">
        <span className="font-medium text-texto">
          {row.original.referrerName}
        </span>
        <span className="text-ayuda text-texto-tenue">
          {count(
            row.original.referrerReferralCount,
            "referida en total",
            "referidas en total",
          )}
        </span>
      </span>
    ),
  }),
  columns.accessor("referredName", {
    header: "Cliente referido",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario">{getValue()}</span>
    ),
  }),
  columns.accessor("registeredAt", {
    header: "Fecha de registro",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario tabular">
        {formatCivilDate(boliviaParts(getValue()).date)}
      </span>
    ),
  }),
];

function EmptyReferrals({ searching }: { searching: boolean }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">
        {searching
          ? "No se encontró ningún referido."
          : "Todavía no hay referidos."}
      </span>
      {searching ? (
        <span className="text-nota text-texto-tenue">
          Revisa cómo escribiste el nombre de la clienta.
        </span>
      ) : null}
      <span className="text-ayuda text-texto-muy-tenue">
        Un referido nace cuando una clienta se registra con el código de otra.
      </span>
    </span>
  );
}

// AW26: a read-only list of the studio's Referrals for support and
// reconciliation; nothing here creates or edits one.
export function ReferralsPage({
  search,
  onSearchChange,
}: {
  search: NameSearch;
  onSearchChange: SearchChange<NameSearch>;
}) {
  const query = useQuery(referralTableQueryOptions(search));

  return (
    <CatalogPage
      title="Referidos"
      subtitle={
        query.data === undefined
          ? undefined
          : studioSummary(query.data.awardedCount + query.data.pendingCount)
      }
      loadingMessage="Cargando referidos…"
      what="los referidos"
      emptyMessage={<EmptyReferrals searching={search.q !== undefined} />}
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
          : `${pageRangeLabel(window)} ${window.totalItems === 1 ? "referido" : "referidos"}`
      }
      query={query}
      columns={referralColumns}
    />
  );
}
