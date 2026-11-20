import { formatListDate } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { CatalogPage } from "../../catalog/catalog-page";
import type { SearchChange } from "../../catalog/catalog-search";
import { countFormat, pageRangeLabel } from "../../components/table/pagination";
import { SearchFilter } from "../../components/table/search-filter";
import { boliviaParts } from "../../lib/bolivia-time";
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

const civilDate = (instant: string) =>
  formatListDate(boliviaParts(instant).date);

const columns = createColumnHelper<ReferralRow>();

// The row is the whole record (AW26): no panel, no link.
const referralColumns = () => [
  columns.accessor("referrerName", {
    header: "Clienta que refiere",
    cell: ({ row }) => (
      <span className="flex flex-col">
        <span className="font-medium text-texto">
          {row.original.referrerName}
        </span>
        <span className="text-ayuda text-texto">
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
    header: "Clienta referida",
    cell: ({ getValue }) => <span className="text-texto">{getValue()}</span>,
  }),
  columns.accessor("registeredAt", {
    header: "Fecha de registro",
    cell: ({ getValue }) => (
      <span className="text-texto tabular">{civilDate(getValue())}</span>
    ),
  }),
  // FIX-060 (walkthrough finding 86): her first confirmed Plan purchase.
  columns.accessor("firstPurchaseAt", {
    header: "Compró",
    cell: ({ getValue }) => {
      // A backend before FIX-060 (a rollback) sends no «firstPurchaseAt».
      const boughtAt = getValue() as string | null | undefined;
      return boughtAt === null || boughtAt === undefined ? (
        <span className="text-texto">Aún no</span>
      ) : (
        <span className="text-texto tabular">{civilDate(boughtAt)}</span>
      );
    },
  }),
  // The host's extra class for the invite (BKM-014).
  columns.accessor("inviteReward", {
    header: "Clase de premio",
    meta: { card: "hidden" },
    cell: ({ row }) => {
      const { inviteReward, inviteRewardGrantedAt } = row.original;
      if (inviteReward === "granted" && inviteRewardGrantedAt !== null) {
        return (
          <span className="text-texto tabular">
            {`Sumada el ${civilDate(inviteRewardGrantedAt)}`}
          </span>
        );
      }
      return inviteReward === "owed" ? (
        <span className="text-texto">Se suma con su próximo plan</span>
      ) : (
        <span className="text-texto">—</span>
      );
    },
  }),
];

function EmptyReferrals({ searching }: { searching: boolean }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto">
        {searching
          ? "No se encontró ningún referido."
          : "Todavía no hay referidos."}
      </span>
      {searching ? (
        <span className="text-nota text-texto">
          Revisa cómo escribiste el nombre de la clienta.
        </span>
      ) : null}
      <span className="text-ayuda text-texto">
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
          label="Buscar por nombre de clienta"
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
