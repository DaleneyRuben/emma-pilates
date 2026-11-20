import { formatDateTime } from "@pilates/api-contracts";
import type { AdminSupplyDto, WithdrawalDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { ChevronLeft } from "lucide-react";
import type { SearchChange } from "../../catalog/catalog-search";
import { NoBranchPage } from "../../components/page/no-branch-page";
import { PageHeader } from "../../components/page/page-header";
import { buttonVariants } from "../../components/ui/button";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { DataTable } from "../../components/table/data-table";
import { ListFilter } from "../../components/table/list-filter";
import { MonthStepper } from "../../components/table/month-stepper";
import { countFormat, pageRangeLabel } from "../../components/table/pagination";
import { useKnownOption } from "../../components/table/use-known-option";
import { boliviaMonth, formatMonth } from "../../lib/bolivia-time";
import { archivedLast, namesById } from "../../lib/named";
import type { Branch } from "../../shell/branch/branch-context";
import { useBranchSelection } from "../../shell/branch/use-branch-selection";
import { unitsLabel } from "./supply-format";
import {
  everySupplyQueryOptions,
  withdrawalHistoryQueryOptions,
} from "./supply-queries";
import type { WithdrawalSearch } from "./supply-search";

type MovementKind = WithdrawalDto["kind"];

// Each filter's noun, singular and plural: the summary, the pager and the
// empty state all name what the filter shows.
const nouns: Record<MovementKind | "all", [string, string]> = {
  all: ["movimiento", "movimientos"],
  withdrawal: ["retiro", "retiros"],
  restock: ["reposición", "reposiciones"],
};
const counted = (count: number, kind: MovementKind | "all") =>
  nouns[kind][count === 1 ? 0 : 1];

const kindLabels: Record<MovementKind, string> = {
  withdrawal: "Retiro",
  restock: "Reposición",
};

const kindOptions = [
  { value: "all", label: "Todos" },
  { value: "withdrawal", label: "Retiros" },
  { value: "restock", label: "Reposiciones" },
] as const;

const columns = createColumnHelper<WithdrawalDto>();

const movementColumns = [
  columns.accessor("supplyName", {
    header: "Insumo",
    cell: ({ getValue }) => (
      <span className="font-medium text-texto">{getValue()}</span>
    ),
  }),
  columns.accessor("kind", {
    header: "Movimiento",
    cell: ({ getValue }) => (
      <span className="text-texto">{kindLabels[getValue()]}</span>
    ),
  }),
  columns.accessor("quantity", {
    header: "Cantidad",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-texto tabular">
        {countFormat.format(getValue())}
      </span>
    ),
  }),
  columns.accessor("recordedByName", {
    header: "Registró",
    meta: { card: "hidden" },
    cell: ({ getValue }) => <span className="text-texto">{getValue()}</span>,
  }),
  columns.accessor("recordedAt", {
    header: "Fecha",
    cell: ({ getValue }) => (
      <span className="text-texto tabular">{formatDateTime(getValue())}</span>
    ),
  }),
];

// Active Supplies by name, then the archived ones, whose Withdrawals stay.
const supplyOptions = (supplies: AdminSupplyDto[]) => [
  { value: "all", label: "Todos" },
  ...[...supplies].sort(archivedLast).map((supply) => ({
    value: supply.id,
    label:
      supply.archivedAt === null ? supply.name : `${supply.name} (archivado)`,
  })),
];

const summary = (
  count: number,
  kind: MovementKind | "all",
  month: string,
  supplyName?: string,
) =>
  `${countFormat.format(count)} ${counted(count, kind)}${
    supplyName === undefined ? "" : ` de ${supplyName}`
  } en ${formatMonth(month)}.`;

function EmptyHistory({ kind }: { kind: MovementKind | "all" }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto">Sin {nouns[kind][1]} en este rango.</span>
      <span className="text-nota text-texto">
        Prueba con otro mes o con todos los insumos.
      </span>
    </span>
  );
}

function BranchWithdrawals({
  branch,
  search,
  onSearchChange,
}: {
  branch: Branch;
  search: WithdrawalSearch;
  onSearchChange: SearchChange<WithdrawalSearch>;
}) {
  const latest = boliviaMonth();
  const month = search.month ?? latest;
  const kind = search.kind ?? "all";
  const query = useQuery(
    withdrawalHistoryQueryOptions(branch.id, month, search),
  );
  const supplies = useQuery(everySupplyQueryOptions(branch.id));
  const supplyName =
    search.supplyId === undefined
      ? undefined
      : namesById(supplies.data?.items ?? []).get(search.supplyId);
  useKnownOption(search.supplyId, supplies.data?.items, () =>
    onSearchChange({ supplyId: undefined, page: 1 }),
  );

  return (
    <article className="flex flex-col gap-5">
      <PageHeader title="Insumos" subtitle={`Sucursal ${branch.name}`} />
      {/* Below the band, as a white button: small text stays on white. */}
      <Link
        to="/estudio/insumos"
        className={buttonVariants({
          variant: "secondary",
          size: "sm",
          className: "self-start",
        })}
      >
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        Volver a Insumos
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <MonthStepper
          month={month}
          latest={latest}
          onChange={(next) => onSearchChange({ month: next, page: 1 })}
        />
        <ListFilter
          label="Insumo"
          value={search.supplyId ?? "all"}
          options={supplyOptions(supplies.data?.items ?? [])}
          onChange={(value) =>
            onSearchChange({
              supplyId: value === "all" ? undefined : value,
              page: 1,
            })
          }
        />
        <ListFilter
          label="Movimiento"
          value={kind}
          options={kindOptions}
          onChange={(value) =>
            onSearchChange({
              kind: value === "all" ? undefined : value,
              page: 1,
            })
          }
        />
      </div>
      {query.isPending ? (
        <LoadingNotice>Cargando movimientos…</LoadingNotice>
      ) : query.isError ? (
        <QueryFailure
          error={query.error}
          what="los movimientos"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.data.totalItems === 0 ? null : (
            <p className="text-nota text-texto">
              {summary(query.data.totalItems, kind, month, supplyName)}
            </p>
          )}
          <DataTable
            columns={movementColumns}
            rows={query.data.items}
            rowId={(row) => row.id}
            emptyMessage={<EmptyHistory kind={kind} />}
            pagination={{
              page: search.page,
              pageSize: search.pageSize,
              totalItems: query.data.totalItems,
              onPageChange: (page) => onSearchChange({ page }),
              rangeLabel: (window) =>
                window.totalItems === 0
                  ? pageRangeLabel(window)
                  : `${pageRangeLabel(window)} ${counted(window.totalItems, kind)}`,
            }}
          />
          {query.data.totals.length === 0 ? null : (
            <section className="flex flex-col gap-1 rounded-control border border-borde bg-superficie px-3 py-2.5">
              <h2 className="font-sans text-etiqueta-campo font-medium tracking-[0.14em] text-texto uppercase">
                Consumo del mes
              </h2>
              <p className="text-nota text-texto tabular">
                {query.data.totals
                  .map(
                    (total) =>
                      `${total.supplyName}: ${unitsLabel(total.quantity)}`,
                  )
                  .join(" · ")}
              </p>
            </section>
          )}
        </>
      )}
    </article>
  );
}

// AW31: the monthly consumption record (back-office/CONTEXT.md, Withdrawal),
// reached only from AW08's link (invariant 6), with the Restocks beside the
// Withdrawals and who recorded each (walkthrough finding 102). Nothing here
// is editable: movements are immutable once logged.
export function WithdrawalsPage({
  search,
  onSearchChange,
}: {
  search: WithdrawalSearch;
  onSearchChange: SearchChange<WithdrawalSearch>;
}) {
  const { selectedBranch, status } = useBranchSelection();
  if (selectedBranch === undefined) {
    return (
      <NoBranchPage
        title="Insumos"
        pending={status === "pending"}
        loadingMessage="Cargando movimientos…"
        emptyMessage="Todavía no hay sucursales activas."
      />
    );
  }
  return (
    <BranchWithdrawals
      key={selectedBranch.id}
      branch={selectedBranch}
      search={search}
      onSearchChange={onSearchChange}
    />
  );
}
